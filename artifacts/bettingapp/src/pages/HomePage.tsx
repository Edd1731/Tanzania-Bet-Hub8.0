import { useState } from "react";
import { useGetEvents, usePlaceBet } from "@workspace/api-client-react";
import type { Event } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/use-translation";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetStatsSummaryQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";

const GOLD = "#FDD017";
const NAVY = "#0d1f3c";
const NAVY2 = "#0a1628";
const GREEN = "#1B8A3C";

type BetItem = {
  eventId: number;
  teamHome: string;
  teamAway: string;
  choice: string;
  label: string;
  odds: number;
  amount: string;
};

function dcOdds(o1: number, o2: number) {
  return Math.round((1 / (1 / o1 + 1 / o2)) * 0.95 * 100) / 100;
}

function buildMarkets(ev: Event) {
  const H = ev.oddsHome, D = ev.oddsDraw, A = ev.oddsAway;
  return [
    {
      id: "dc", label: "Double Chance",
      selections: [
        { choice: "dc_1x", label: "1X", sublabel: "Home or Draw", odds: dcOdds(H, D) },
        { choice: "dc_x2", label: "X2", sublabel: "Draw or Away", odds: dcOdds(D, A) },
        { choice: "dc_12", label: "12", sublabel: "Home or Away", odds: dcOdds(H, A) },
      ],
    },
    {
      id: "ou", label: "Over / Under Goals",
      selections: [
        { choice: "ou_o15", label: "Over 1.5", sublabel: "", odds: ev.oddsO15 ?? 1.25 },
        { choice: "ou_u15", label: "Under 1.5", sublabel: "", odds: ev.oddsU15 ?? 3.50 },
        { choice: "ou_o25", label: "Over 2.5", sublabel: "", odds: ev.oddsO25 ?? 1.90 },
        { choice: "ou_u25", label: "Under 2.5", sublabel: "", odds: ev.oddsU25 ?? 1.85 },
        { choice: "ou_o35", label: "Over 3.5", sublabel: "", odds: ev.oddsO35 ?? 2.80 },
        { choice: "ou_u35", label: "Under 3.5", sublabel: "", odds: ev.oddsU35 ?? 1.40 },
      ],
    },
    {
      id: "btts", label: "Both Teams to Score",
      selections: [
        { choice: "btts_yes", label: "Yes", sublabel: "Both score", odds: ev.oddsBttsY ?? 1.75 },
        { choice: "btts_no",  label: "No",  sublabel: "Not both",  odds: ev.oddsBttsN ?? 1.95 },
      ],
    },
  ];
}

// Odds filter thresholds
const ODD_FILTERS = [
  { label: "Under 1.20", max: 1.20 },
  { label: "Under 1.50", max: 1.50 },
  { label: "Under 1.80", max: 1.80 },
] as const;

const SPORT_CATS = [
  { id: "football", label: "Football", icon: "⚽", active: true },
  { id: "basketball", label: "Basketball", icon: "🏀", active: false },
  { id: "tennis", label: "Tennis", icon: "🎾", active: false },
  { id: "efootball", label: "eFootball", icon: "🎮", active: false },
];

const TOP_TABS = [
  { id: "sports", label: "Sports", badge: null },
  { id: "live",   label: "Live",   badge: "LIVE" },
  { id: "aviator",label: "Aviator",badge: "NEW" },
  { id: "casino", label: "Casino", badge: null },
  { id: "virtuals",label:"Virtuals",badge: null },
];

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: events, isLoading } = useGetEvents({
    query: { refetchInterval: 30_000 }, // auto-refresh every 30 s for live scores
  });
  const placeBet = usePlaceBet();

  const [activeTab, setActiveTab]       = useState("sports");
  const [activeSport, setActiveSport]   = useState("football");
  const [activeOddFilter, setActiveOddFilter] = useState<number | null>(null);
  const [betSlip, setBetSlip]           = useState<BetItem[]>([]);
  const [slipOpen, setSlipOpen]         = useState(false);
  const [expandedMarkets, setExpandedMarkets] = useState<Set<number>>(new Set());
  const [placingBet, setPlacingBet]     = useState(false);
  const [successMsg, setSuccessMsg]     = useState("");
  const [errorMsg, setErrorMsg]         = useState("");

  const toggleMarkets = (eventId: number) => {
    setExpandedMarkets(prev => {
      const next = new Set(prev);
      next.has(eventId) ? next.delete(eventId) : next.add(eventId);
      return next;
    });
  };

  const addToBetSlip = (
    eventId: number, teamHome: string, teamAway: string,
    choice: string, label: string, odds: number
  ) => {
    setBetSlip(prev => {
      const idx = prev.findIndex(b => b.eventId === eventId);
      if (idx >= 0) {
        if (prev[idx].choice === choice) return prev.filter(b => b.eventId !== eventId);
        const updated = [...prev];
        updated[idx] = { ...updated[idx], choice, label, odds };
        return updated;
      }
      return [...prev, { eventId, teamHome, teamAway, choice, label, odds, amount: "1000" }];
    });
    setSuccessMsg(""); setErrorMsg("");
  };

  const removeFromSlip = (id: number) => setBetSlip(prev => prev.filter(b => b.eventId !== id));
  const updateAmount   = (id: number, v: string) => setBetSlip(prev => prev.map(b => b.eventId === id ? { ...b, amount: v } : b));

  const totalStake     = betSlip.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
  const totalPotential = betSlip.reduce((s, b) => s + (parseFloat(b.amount) || 0) * b.odds, 0);

  const handlePlaceAll = async () => {
    if (!user) { navigate("/login"); return; }
    if (!betSlip.length) return;
    setPlacingBet(true); setErrorMsg("");
    try {
      for (const bet of betSlip) {
        const amt = parseFloat(bet.amount);
        if (isNaN(amt) || amt <= 0) throw new Error("Invalid amount");
        await placeBet.mutateAsync({ data: { eventId: bet.eventId, choice: bet.choice as any, amount: amt } });
      }
      setBetSlip([]); setSlipOpen(false);
      setSuccessMsg("✓ Bets placed!");
      qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      qc.invalidateQueries({ queryKey: getGetStatsSummaryQueryKey() });
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err?.message || "Failed to place bet");
    }
    setPlacingBet(false);
  };

  const LIVE_STATUS = new Set(["1H", "2H", "HT", "ET", "P", "BT", "INT", "LIVE"]);
  const isLiveMatch  = (ev: Event) => LIVE_STATUS.has(ev.statusShort ?? "NS");
  const isFinished   = (ev: Event) => ["FT", "AET", "PEN", "AWD", "WO"].includes(ev.statusShort ?? "");

  // Filter events by odds filter + active tab
  const filteredEvents = (events ?? []).filter(ev => {
    if (activeTab === "live"    && !isLiveMatch(ev))  return false;
    if (activeTab === "sports"  && isFinished(ev))     return false;
    if (activeOddFilter !== null) {
      return ev.oddsHome <= activeOddFilter || ev.oddsDraw <= activeOddFilter || ev.oddsAway <= activeOddFilter;
    }
    return true;
  });

  // Sort: live first, then by kick-off time
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const aLive = isLiveMatch(a) ? 0 : 1;
    const bLive = isLiveMatch(b) ? 0 : 1;
    if (aLive !== bLive) return aLive - bLive;
    return new Date(a.startsAt ?? 0).getTime() - new Date(b.startsAt ?? 0).getTime();
  });

  // Group by league
  const grouped: Record<string, Event[]> = {};
  sortedEvents.forEach(ev => {
    if (!grouped[ev.league]) grouped[ev.league] = [];
    grouped[ev.league]!.push(ev);
  });

  const liveCount = (events ?? []).filter(isLiveMatch).length;

  return (
    <div style={{ background: NAVY2, minHeight: "100vh" }} className="pb-20">

      {/* ── TOP NAV TABS ── */}
      <div className="sticky top-0 z-30 overflow-x-auto scrollbar-none" style={{ background: NAVY }}>
        <div className="flex items-center px-1 gap-0" style={{ minWidth: "max-content" }}>
          {TOP_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap transition-colors"
              style={{
                color: activeTab === tab.id ? GOLD : "rgba(255,255,255,0.55)",
                borderBottom: activeTab === tab.id ? `2px solid ${GOLD}` : "2px solid transparent",
              }}
            >
              {tab.label}
              {tab.badge === "LIVE" && (
                <span className="flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-600 text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {liveCount > 0 ? liveCount : "LIVE"}
                </span>
              )}
              {tab.badge === "NEW" && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-black" style={{ background: GOLD }}>NEW</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── SPORTS CATEGORY ROW ── */}
      <div className="overflow-x-auto scrollbar-none" style={{ background: "#0c1a30" }}>
        <div className="flex items-center gap-1 px-3 py-2" style={{ minWidth: "max-content" }}>
          {SPORT_CATS.map(sport => (
            <button
              key={sport.id}
              onClick={() => setActiveSport(sport.id)}
              className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-all"
              style={{
                background: activeSport === sport.id ? "rgba(253,208,23,0.12)" : "transparent",
                border: activeSport === sport.id ? `1px solid ${GOLD}40` : "1px solid transparent",
              }}
            >
              <span className="text-xl leading-none">{sport.icon}</span>
              <span
                className="text-[9px] font-bold whitespace-nowrap"
                style={{ color: activeSport === sport.id ? GOLD : "rgba(255,255,255,0.5)" }}
              >
                {sport.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── PROMO BANNER ── */}
      <div
        className="mx-3 mt-3 mb-2 rounded-xl overflow-hidden relative flex items-center justify-between px-4 py-3"
        style={{
          background: "linear-gradient(135deg, #1a0a2e 0%, #3d1a6e 50%, #0d1f3c 100%)",
          border: "1px solid #5a2d9c40",
          minHeight: "76px",
        }}
      >
        {/* Left content */}
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-black text-white/70 uppercase tracking-widest">Aviator</span>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-black" style={{ background: GOLD }}>NEW</span>
          </div>
          <div className="text-2xl font-black text-white leading-tight">Win Up To</div>
          <div className="text-3xl font-black leading-tight" style={{ color: GOLD }}>TZS 5,000,000</div>
        </div>
        {/* Right: big multiplier visual */}
        <div className="text-right">
          <div className="text-5xl font-black" style={{ color: GOLD, textShadow: "0 0 30px #FDD01780" }}>×100</div>
          <button
            className="mt-1 px-4 py-1.5 rounded-full text-xs font-black text-black"
            style={{ background: GOLD }}
          >
            Play Now
          </button>
        </div>
        {/* Decorative plane */}
        <div
          className="absolute right-28 top-2 text-2xl opacity-20 rotate-12"
          style={{ fontSize: "36px" }}
        >✈️</div>
      </div>

      {/* ── ODDS FILTER BUTTONS ── */}
      <div className="px-3 mb-3 flex items-center gap-2">
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider shrink-0">Filter:</span>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {ODD_FILTERS.map(f => (
            <button
              key={f.max}
              onClick={() => setActiveOddFilter(activeOddFilter === f.max ? null : f.max)}
              className="text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap transition-all border"
              style={{
                background: activeOddFilter === f.max ? GOLD : "transparent",
                color: activeOddFilter === f.max ? "#000" : "rgba(255,255,255,0.5)",
                borderColor: activeOddFilter === f.max ? GOLD : "rgba(255,255,255,0.1)",
              }}
            >
              {f.label}
            </button>
          ))}
          {activeOddFilter !== null && (
            <button
              onClick={() => setActiveOddFilter(null)}
              className="text-[10px] font-bold px-2 py-1 rounded-full"
              style={{ color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex gap-4 px-3">
        {/* Events column */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-36 rounded-xl animate-pulse" style={{ background: "#111827" }} />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20 text-white/30">{t("no_events")}</div>
          ) : (
            <div className="space-y-0.5">
              {Object.entries(grouped).map(([league, leagueEvents]) => (
                <div key={league} className="mb-4">
                  {/* League header */}
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-t-xl"
                    style={{ background: "#0c1a30", borderLeft: `3px solid ${GREEN}` }}
                  >
                    {leagueEvents[0]?.leagueLogo ? (
                      <img
                        src={leagueEvents[0].leagueLogo}
                        alt={league}
                        className="w-4 h-4 object-contain shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: GREEN }}>
                        <span className="text-[8px] text-white font-black">⚽</span>
                      </div>
                    )}
                    <div>
                      <span className="text-[11px] font-black text-white/70 uppercase tracking-widest">{league}</span>
                      {leagueEvents[0]?.country && (
                        <span className="text-[9px] text-white/30 ml-1.5">{leagueEvents[0].country}</span>
                      )}
                    </div>
                    <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full text-white/40" style={{ background: "rgba(255,255,255,0.05)" }}>
                      {leagueEvents.length} match{leagueEvents.length > 1 ? "es" : ""}
                    </span>
                  </div>

                  {/* Match cards */}
                  <div className="space-y-0.5">
                    {leagueEvents.map((event, idx) => {
                      const inSlip  = betSlip.find(b => b.eventId === event.id);
                      const isOpen  = expandedMarkets.has(event.id);
                      const markets = buildMarkets(event);
                      const totalExtra = markets.reduce((n, m) => n + m.selections.length, 0);

                      return (
                        <div
                          key={event.id}
                          className="overflow-hidden"
                          style={{
                            background: inSlip ? "#0f2a1a" : "#111827",
                            borderLeft: inSlip ? `3px solid ${GREEN}` : "3px solid transparent",
                            borderBottom: idx < leagueEvents.length - 1 ? "1px solid rgba(255,255,255,0.04)" : undefined,
                            borderRadius: idx === leagueEvents.length - 1 ? "0 0 12px 12px" : undefined,
                          }}
                        >
                          {/* Match info row */}
                          <div className="px-3 pt-2.5 pb-1 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {/* Status badge */}
                              {isLiveMatch(event) ? (
                                <span className="flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: "#DC2626" }}>
                                  <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                                  {event.statusShort === "HT" ? "HT" : event.statusShort === "ET" ? "ET" : "LIVE"}
                                  {event.elapsed != null && event.statusShort !== "HT" && (
                                    <span className="ml-0.5">{event.elapsed}&apos;</span>
                                  )}
                                </span>
                              ) : isFinished(event) ? (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white/70" style={{ background: "rgba(255,255,255,0.1)" }}>
                                  {event.statusShort === "AET" ? "AET" : event.statusShort === "PEN" ? "PEN" : "FT"}
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-white/30 uppercase tracking-wide">
                                  {event.startsAt
                                    ? new Date(event.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                    : "Today"}
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-white/20 truncate max-w-[120px]">{event.league}</span>
                          </div>

                          {/* Teams + odds */}
                          <div className="px-3 pb-2">
                            {/* Team names + logos + live score */}
                            <div className="flex items-center justify-between mb-2 gap-2">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                {event.logoHome && (
                                  <img
                                    src={event.logoHome}
                                    alt={event.teamHome}
                                    className="w-5 h-5 object-contain shrink-0"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                )}
                                <span className="text-sm font-black text-white truncate">{event.teamHome}</span>
                              </div>

                              {/* Live score OR vs */}
                              {(isLiveMatch(event) || isFinished(event)) && event.scoreHome != null && event.scoreAway != null ? (
                                <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-lg" style={{ background: isLiveMatch(event) ? "rgba(220,38,38,0.15)" : "rgba(255,255,255,0.06)" }}>
                                  <span className="text-sm font-black" style={{ color: isLiveMatch(event) ? "#ef4444" : "white" }}>{event.scoreHome}</span>
                                  <span className="text-[10px] text-white/30 font-black">-</span>
                                  <span className="text-sm font-black" style={{ color: isLiveMatch(event) ? "#ef4444" : "white" }}>{event.scoreAway}</span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-black text-white/30 mx-1 shrink-0">VS</span>
                              )}

                              <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                                <span className="text-sm font-black text-white truncate">{event.teamAway}</span>
                                {event.logoAway && (
                                  <img
                                    src={event.logoAway}
                                    alt={event.teamAway}
                                    className="w-5 h-5 object-contain shrink-0"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                )}
                              </div>
                            </div>

                            {/* 1X2 odds buttons */}
                            <div className="grid grid-cols-3 gap-1.5">
                              {([
                                { choice: "home", code: "1", label: t("home"), odds: event.oddsHome },
                                { choice: "draw", code: "X", label: t("draw"), odds: event.oddsDraw },
                                { choice: "away", code: "2", label: t("away"), odds: event.oddsAway },
                              ] as const).map(opt => {
                                const selected = inSlip?.choice === opt.choice;
                                return (
                                  <button
                                    key={opt.choice}
                                    onClick={() => addToBetSlip(event.id, event.teamHome, event.teamAway, opt.choice, `1X2: ${opt.label}`, opt.odds)}
                                    className="rounded-lg py-2.5 px-1 text-center transition-all active:scale-95 relative overflow-hidden"
                                    style={{
                                      background: selected
                                        ? GREEN
                                        : "rgba(255,255,255,0.06)",
                                      border: selected
                                        ? `1px solid ${GREEN}`
                                        : "1px solid rgba(255,255,255,0.08)",
                                    }}
                                  >
                                    <div className="text-[9px] font-bold mb-0.5" style={{ color: selected ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)" }}>
                                      {opt.code} · {opt.label}
                                    </div>
                                    <div className="text-sm font-black leading-none" style={{ color: selected ? "#fff" : GOLD }}>
                                      {opt.odds.toFixed(2)}
                                    </div>
                                    {selected && (
                                      <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white/50" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Expanded extra markets */}
                          {isOpen && (
                            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                              {markets.map(market => (
                                <div key={market.id} className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                  <div className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">{market.label}</div>
                                  <div className={`grid gap-1.5 ${market.selections.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                                    {market.selections.map(sel => {
                                      const selected = inSlip?.choice === sel.choice;
                                      return (
                                        <button
                                          key={sel.choice}
                                          onClick={() => addToBetSlip(event.id, event.teamHome, event.teamAway, sel.choice, `${market.label}: ${sel.label}`, sel.odds)}
                                          className="rounded-lg py-2 px-1 text-center transition-all active:scale-95"
                                          style={{
                                            background: selected ? GREEN : "rgba(255,255,255,0.05)",
                                            border: `1px solid ${selected ? GREEN : "rgba(255,255,255,0.07)"}`,
                                          }}
                                        >
                                          <div className="text-[9px] font-semibold mb-0.5 truncate" style={{ color: selected ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.45)" }}>
                                            {sel.label}
                                          </div>
                                          <div className="text-sm font-black" style={{ color: selected ? "#fff" : GOLD }}>
                                            {sel.odds.toFixed(2)}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Footer row: more markets toggle */}
                          <button
                            onClick={() => toggleMarkets(event.id)}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 transition-colors"
                            style={{
                              background: isOpen ? "rgba(253,208,23,0.06)" : "rgba(255,255,255,0.02)",
                              borderTop: "1px solid rgba(255,255,255,0.04)",
                            }}
                          >
                            <span className="text-[10px] font-bold" style={{ color: GOLD }}>
                              {isOpen ? "Hide markets" : `+${totalExtra} more markets`}
                            </span>
                            <svg
                              className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5"
                            >
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Bet Slip */}
        <div className="hidden lg:block w-80 shrink-0">
          <DesktopBetSlip
            betSlip={betSlip} totalStake={totalStake} totalPotential={totalPotential}
            placingBet={placingBet} successMsg={successMsg} errorMsg={errorMsg}
            user={user} t={t}
            removeFromSlip={removeFromSlip} updateAmount={updateAmount}
            handlePlaceAll={handlePlaceAll} navigate={navigate}
          />
        </div>
      </div>

      {/* ── Floating betslip button (mobile) ── */}
      {betSlip.length > 0 && !slipOpen && (
        <button
          onClick={() => setSlipOpen(true)}
          className="lg:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-2xl"
          style={{ background: GREEN, border: `2px solid ${GOLD}` }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
            <path d="M9 12h6M9 16h4"/>
          </svg>
          <span
            className="text-[10px] font-black leading-none mt-0.5"
            style={{ color: GOLD }}
          >
            {betSlip.length}
          </span>
        </button>
      )}

      {/* ── Mobile bet slip bottom sheet ── */}
      {slipOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/70 z-40 backdrop-blur-sm" onClick={() => setSlipOpen(false)} />
          <div
            className="lg:hidden fixed left-0 right-0 z-50 rounded-t-2xl overflow-hidden flex flex-col"
            style={{ bottom: "56px", maxHeight: "80vh", background: "#0f1e35", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Handle bar */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">{t("bet_slip")}</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-black" style={{ background: GOLD }}>{betSlip.length}</span>
              </div>
              <button onClick={() => setSlipOpen(false)} className="text-white/40 hover:text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Selections */}
            <div className="flex-1 overflow-y-auto divide-y" style={{ divideColor: "rgba(255,255,255,0.04)" }}>
              {betSlip.map(bet => (
                <div key={bet.eventId} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">{bet.teamHome} v {bet.teamAway}</div>
                      <div className="text-[11px] font-semibold mt-0.5" style={{ color: GOLD }}>{bet.label} @ {bet.odds.toFixed(2)}</div>
                    </div>
                    <button onClick={() => removeFromSlip(bet.eventId)} className="w-6 h-6 flex items-center justify-center rounded-full text-xs text-white/40 hover:text-white shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>✕</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40 shrink-0">TZS</span>
                    <input
                      type="number" value={bet.amount}
                      onChange={e => updateAmount(bet.eventId, e.target.value)}
                      className="flex-1 rounded-lg px-3 py-1.5 text-sm text-white font-bold outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                      min="100"
                    />
                  </div>
                  <div className="text-[11px] mt-1 text-white/40">
                    Potential: <span className="font-black" style={{ color: GOLD }}>TZS {((parseFloat(bet.amount) || 0) * bet.odds).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals + place */}
            <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#0a1525" }}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/40">Total Stake</span>
                <span className="font-bold text-white">TZS {totalStake.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs mb-3">
                <span className="text-white/40">Potential Win</span>
                <span className="font-black" style={{ color: GOLD }}>TZS {totalPotential.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              {errorMsg && <div className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2 mb-2">{errorMsg}</div>}
              {successMsg && <div className="text-xs text-green-400 bg-green-400/10 rounded-lg px-3 py-2 mb-2">{successMsg}</div>}
              <button
                onClick={handlePlaceAll} disabled={placingBet}
                className="w-full py-3.5 rounded-xl text-sm font-black text-black disabled:opacity-50 transition-opacity"
                style={{ background: GOLD }}
              >
                {placingBet ? "Placing bets..." : `${t("place_bet")} · ${betSlip.length} selection${betSlip.length > 1 ? "s" : ""}`}
              </button>
              {!user && <p className="text-[11px] text-center mt-2 text-white/30">Login to place bets</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Desktop Bet Slip ──────────────────────────────────────────
function DesktopBetSlip({ betSlip, totalStake, totalPotential, placingBet, successMsg, errorMsg,
  user, t, removeFromSlip, updateAmount, handlePlaceAll, navigate }: {
  betSlip: BetItem[]; totalStake: number; totalPotential: number;
  placingBet: boolean; successMsg: string; errorMsg: string;
  user: any; t: (k: string) => string;
  removeFromSlip: (id: number) => void; updateAmount: (id: number, v: string) => void;
  handlePlaceAll: () => void; navigate: (p: string) => void;
}) {
  return (
    <div className="sticky top-24 rounded-xl overflow-hidden" style={{ background: "#0f1e35", border: "1px solid rgba(255,255,255,0.08)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "#0a1525", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="font-black text-white text-sm">{t("bet_slip")}</span>
        {betSlip.length > 0 && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-black" style={{ background: GOLD }}>{betSlip.length}</span>
        )}
      </div>

      {betSlip.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <div className="text-3xl mb-2">🎯</div>
          <div className="text-sm text-white/40">{t("empty_slip")}</div>
          <div className="text-xs text-white/20 mt-1">Click any odds to add</div>
        </div>
      ) : (
        <>
          <div className="max-h-80 overflow-y-auto divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {betSlip.map(bet => (
              <div key={bet.eventId} className="px-4 py-3">
                <div className="flex items-start gap-2 justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">{bet.teamHome} v {bet.teamAway}</div>
                    <div className="text-[11px] font-semibold mt-0.5" style={{ color: GOLD }}>{bet.label} @ {bet.odds.toFixed(2)}</div>
                  </div>
                  <button onClick={() => removeFromSlip(bet.eventId)} className="text-white/30 hover:text-white text-xs w-5 h-5 flex items-center justify-center shrink-0">✕</button>
                </div>
                <div className="flex gap-1.5 items-center">
                  <span className="text-[10px] text-white/30">TZS</span>
                  <input
                    type="number" value={bet.amount} onChange={e => updateAmount(bet.eventId, e.target.value)}
                    className="flex-1 rounded-lg px-2 py-1.5 text-xs text-white w-0 outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    min="100"
                  />
                </div>
                <div className="text-[10px] mt-1 text-white/30">
                  Win: <span className="font-black" style={{ color: GOLD }}>TZS {((parseFloat(bet.amount) || 0) * bet.odds).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-white/40">Total Stake</span>
              <span className="font-bold text-white">TZS {totalStake.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[11px] mb-3">
              <span className="text-white/40">Potential Win</span>
              <span className="font-black" style={{ color: GOLD }}>TZS {totalPotential.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            {successMsg && <div className="text-xs text-green-400 bg-green-400/10 rounded-lg px-2 py-1.5 mb-2">{successMsg}</div>}
            {errorMsg && <div className="text-xs text-red-400 bg-red-400/10 rounded-lg px-2 py-1.5 mb-2">{errorMsg}</div>}
            <button
              onClick={handlePlaceAll} disabled={placingBet}
              className="w-full py-2.5 rounded-xl text-sm font-black text-black disabled:opacity-50"
              style={{ background: GOLD }}
            >
              {placingBet ? "Placing..." : t("place_bet")}
            </button>
            {!user && (
              <button onClick={() => navigate("/login")} className="w-full text-xs text-center mt-2 text-white/30 hover:text-white/60">
                Login to place bets
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
