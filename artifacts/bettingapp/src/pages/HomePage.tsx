import { useState } from "react";
import { useGetEvents, usePlaceBet } from "@workspace/api-client-react";
import type { Event } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/use-translation";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetStatsSummaryQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";

type BetItem = {
  eventId: number;
  teamHome: string;
  teamAway: string;
  choice: string;
  label: string;
  odds: number;
  amount: string;
};

// Compute Double Chance odds from 1X2 (95% payout margin)
function dcOdds(o1: number, o2: number) {
  return Math.round((1 / (1 / o1 + 1 / o2)) * 0.95 * 100) / 100;
}

// Market definitions for an event
function buildMarkets(ev: Event) {
  const H = ev.oddsHome, D = ev.oddsDraw, A = ev.oddsAway;
  return [
    {
      id: "dc",
      label: "Double Chance",
      selections: [
        { choice: "dc_1x", label: "1X Home or Draw", odds: dcOdds(H, D) },
        { choice: "dc_x2", label: "X2 Draw or Away", odds: dcOdds(D, A) },
        { choice: "dc_12", label: "12 Home or Away", odds: dcOdds(H, A) },
      ],
    },
    {
      id: "ou",
      label: "Over / Under Goals",
      selections: [
        { choice: "ou_o15", label: "Over 1.5", odds: ev.oddsO15 ?? 1.25 },
        { choice: "ou_u15", label: "Under 1.5", odds: ev.oddsU15 ?? 3.50 },
        { choice: "ou_o25", label: "Over 2.5", odds: ev.oddsO25 ?? 1.90 },
        { choice: "ou_u25", label: "Under 2.5", odds: ev.oddsU25 ?? 1.85 },
        { choice: "ou_o35", label: "Over 3.5", odds: ev.oddsO35 ?? 2.80 },
        { choice: "ou_u35", label: "Under 3.5", odds: ev.oddsU35 ?? 1.40 },
      ],
    },
    {
      id: "btts",
      label: "Both Teams To Score",
      selections: [
        { choice: "btts_yes", label: "Yes", odds: ev.oddsBttsY ?? 1.75 },
        { choice: "btts_no",  label: "No",  odds: ev.oddsBttsN ?? 1.95 },
      ],
    },
  ];
}

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: events, isLoading } = useGetEvents();
  const placeBet = usePlaceBet();

  const [betSlip, setBetSlip] = useState<BetItem[]>([]);
  const [slipOpen, setSlipOpen] = useState(false);
  const [expandedMarkets, setExpandedMarkets] = useState<Set<number>>(new Set());
  const [placingBet, setPlacingBet] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const toggleMarkets = (eventId: number) => {
    setExpandedMarkets(prev => {
      const next = new Set(prev);
      next.has(eventId) ? next.delete(eventId) : next.add(eventId);
      return next;
    });
  };

  const addToBetSlip = (eventId: number, teamHome: string, teamAway: string, choice: string, label: string, odds: number) => {
    setBetSlip(prev => {
      const existing = prev.findIndex(b => b.eventId === eventId);
      if (existing >= 0) {
        if (prev[existing].choice === choice) return prev.filter(b => b.eventId !== eventId);
        const updated = [...prev];
        updated[existing] = { ...updated[existing], choice, label, odds };
        return updated;
      }
      return [...prev, { eventId, teamHome, teamAway, choice, label, odds, amount: "1000" }];
    });
    setSuccessMsg("");
    setErrorMsg("");
  };

  const removeFromSlip = (eventId: number) => setBetSlip(prev => prev.filter(b => b.eventId !== eventId));
  const updateAmount = (eventId: number, amount: string) =>
    setBetSlip(prev => prev.map(b => b.eventId === eventId ? { ...b, amount } : b));

  const totalStake = betSlip.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
  const totalPotential = betSlip.reduce((s, b) => s + (parseFloat(b.amount) || 0) * b.odds, 0);

  const handlePlaceAll = async () => {
    if (!user) { navigate("/login"); return; }
    if (betSlip.length === 0) return;
    setPlacingBet(true); setErrorMsg("");
    try {
      for (const bet of betSlip) {
        const amt = parseFloat(bet.amount);
        if (isNaN(amt) || amt <= 0) throw new Error("Invalid amount");
        await placeBet.mutateAsync({ data: { eventId: bet.eventId, choice: bet.choice as any, amount: amt } });
      }
      setBetSlip([]); setSlipOpen(false);
      setSuccessMsg("✓ Bets placed successfully!");
      qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      qc.invalidateQueries({ queryKey: getGetStatsSummaryQueryKey() });
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err?.message || "Error placing bet");
    }
    setPlacingBet(false);
  };

  // Group events by league
  const grouped: Record<string, Event[]> = {};
  (events ?? []).forEach(ev => {
    if (!grouped[ev.league]) grouped[ev.league] = [];
    grouped[ev.league]!.push(ev);
  });

  return (
    <div className="pb-36 sm:pb-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-0 sm:gap-6">

          {/* ── Events list ── */}
          <div className="flex-1 min-w-0">
            <div className="px-3 pt-4 pb-2 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-black text-foreground">{t("events")}</h1>
                <p className="text-xs text-muted-foreground">NBC Premier League &amp; International</p>
              </div>
              {successMsg && (
                <div className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-2 py-1">{successMsg}</div>
              )}
            </div>

            {isLoading ? (
              <div className="px-3 space-y-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-32 bg-card rounded-xl animate-pulse border border-border" />
                ))}
              </div>
            ) : (events ?? []).length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">{t("no_events")}</div>
            ) : (
              <div>
                {Object.entries(grouped).map(([league, leagueEvents]) => (
                  <div key={league}>
                    {/* League header */}
                    <div className="flex items-center gap-2 px-3 py-2 mt-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "#1B8A3C" }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{league}</span>
                    </div>

                    <div className="px-3 space-y-2">
                      {leagueEvents.map(event => {
                        const inSlip = betSlip.find(b => b.eventId === event.id);
                        const isOpen = expandedMarkets.has(event.id);
                        const markets = buildMarkets(event);

                        return (
                          <div
                            key={event.id}
                            className={`rounded-xl border overflow-hidden transition-all ${
                              inSlip ? "border-primary/50 bg-primary/5" : "border-border bg-card"
                            }`}
                          >
                            {/* ── Match header ── */}
                            <div className="px-3 pt-3 pb-2">
                              {/* Teams */}
                              <div className="flex items-center justify-between mb-2.5">
                                <div className="flex-1 text-left">
                                  <span className="text-sm font-bold text-foreground">{event.teamHome}</span>
                                </div>
                                <div className="mx-2 shrink-0">
                                  <span className="text-[10px] font-black text-muted-foreground bg-muted px-2 py-0.5 rounded-full">VS</span>
                                </div>
                                <div className="flex-1 text-right">
                                  <span className="text-sm font-bold text-foreground">{event.teamAway}</span>
                                </div>
                              </div>

                              {/* 1X2 buttons */}
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
                                      className={`relative rounded-lg py-2.5 px-2 text-center transition-all active:scale-95 border ${
                                        selected
                                          ? "bg-primary border-primary text-primary-foreground shadow-md"
                                          : "bg-muted/80 border-border text-foreground hover:border-primary/60"
                                      }`}
                                    >
                                      <div className={`text-[10px] font-bold mb-0.5 ${selected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                        {opt.code} · {opt.label}
                                      </div>
                                      <div className="text-base font-black leading-none">{opt.odds.toFixed(2)}</div>
                                      {selected && <div className="absolute top-1 right-1 w-2 h-2 bg-primary-foreground/80 rounded-full" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* ── Expanded markets ── */}
                            {isOpen && (
                              <div className="border-t border-border/60 divide-y divide-border/40">
                                {markets.map(market => (
                                  <div key={market.id} className="px-3 py-2.5">
                                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{market.label}</div>
                                    <div className={`grid gap-1.5 ${market.selections.length === 2 ? "grid-cols-2" : market.selections.length === 3 ? "grid-cols-3" : "grid-cols-3"}`}>
                                      {market.selections.map(sel => {
                                        const selected = inSlip?.choice === sel.choice;
                                        return (
                                          <button
                                            key={sel.choice}
                                            onClick={() => addToBetSlip(event.id, event.teamHome, event.teamAway, sel.choice, `${market.label}: ${sel.label}`, sel.odds)}
                                            className={`rounded-lg py-2 px-1.5 text-center transition-all active:scale-95 border ${
                                              selected
                                                ? "bg-primary border-primary text-primary-foreground"
                                                : "bg-muted/60 border-border hover:border-primary/60"
                                            }`}
                                          >
                                            <div className={`text-[9px] font-semibold mb-0.5 truncate ${selected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                              {sel.label}
                                            </div>
                                            <div className="text-sm font-black leading-none">{sel.odds.toFixed(2)}</div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* ── Footer: status + more markets toggle ── */}
                            <div className="px-3 py-1.5 bg-muted/20 border-t border-border/50 flex items-center justify-between">
                              <span className={`text-[10px] font-semibold ${event.status === "active" ? "text-green-400" : "text-muted-foreground"}`}>
                                {event.status === "active" ? "● LIVE" : event.status}
                              </span>
                              <button
                                onClick={() => toggleMarkets(event.id)}
                                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors"
                              >
                                {isOpen ? "Hide Markets" : `+${markets.reduce((n, m) => n + m.selections.length, 0)} More Markets`}
                                <svg
                                  className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                >
                                  <path d="m6 9 6 6 6-6"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Desktop Bet Slip ── */}
          <div className="hidden lg:block w-80 shrink-0 pt-4">
            <BetSlipPanel
              betSlip={betSlip} totalStake={totalStake} totalPotential={totalPotential}
              placingBet={placingBet} successMsg={successMsg} errorMsg={errorMsg}
              user={user} t={t}
              removeFromSlip={removeFromSlip} updateAmount={updateAmount}
              handlePlaceAll={handlePlaceAll} navigate={navigate}
            />
          </div>
        </div>
      </div>

      {/* ── Mobile Bet Slip sheet ── */}
      <div className="lg:hidden">
        {betSlip.length > 0 && (
          <>
            {slipOpen && <div className="fixed inset-0 bg-black/60 z-30" onClick={() => setSlipOpen(false)} />}
            <div
              className={`fixed left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl transition-all duration-300 ease-out ${slipOpen ? "max-h-[80vh]" : "max-h-24"} overflow-hidden flex flex-col`}
              style={{ bottom: user ? "56px" : "0" }}
            >
              {/* Handle */}
              <button className="w-full flex flex-col items-center pt-2 shrink-0" onClick={() => setSlipOpen(!slipOpen)}>
                <div className="w-10 h-1 bg-border rounded-full mb-2" />
                <div className="w-full px-4 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black">{t("bet_slip")}</span>
                    <span className="bg-primary text-primary-foreground text-xs font-black px-2 py-0.5 rounded-full">{betSlip.length}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Stake: <span className="text-foreground font-bold">TZS {totalStake.toLocaleString()}</span></span>
                    <svg className={`w-4 h-4 text-muted-foreground transition-transform ${slipOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m18 15-6-6-6 6"/></svg>
                  </div>
                </div>
              </button>

              {slipOpen && (
                <div className="flex-1 overflow-y-auto px-4">
                  {betSlip.map(bet => (
                    <div key={bet.eventId} className="py-3 border-b border-border/50">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-foreground truncate">{bet.teamHome} v {bet.teamAway}</div>
                          <div className="text-xs text-primary font-semibold mt-0.5">{bet.label} @ {bet.odds.toFixed(2)}</div>
                        </div>
                        <button onClick={() => removeFromSlip(bet.eventId)} className="w-6 h-6 flex items-center justify-center rounded-full bg-destructive/10 text-destructive text-xs shrink-0">✕</button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground shrink-0">TZS</span>
                        <input type="number" value={bet.amount} onChange={e => updateAmount(bet.eventId, e.target.value)}
                          className="flex-1 bg-background border border-input rounded-lg px-3 py-1.5 text-sm text-foreground" min="100" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Win: <span className="text-primary font-bold">TZS {((parseFloat(bet.amount) || 0) * bet.odds).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  <div className="py-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Stake</span>
                      <span className="font-bold">TZS {totalStake.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Potential Win</span>
                      <span className="font-black text-primary">TZS {totalPotential.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    {errorMsg && <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{errorMsg}</div>}
                    {successMsg && <div className="text-xs text-green-400 bg-green-400/10 rounded-lg px-3 py-2">{successMsg}</div>}
                    <button onClick={handlePlaceAll} disabled={placingBet}
                      className="w-full bg-primary text-primary-foreground font-black py-3.5 rounded-xl text-sm disabled:opacity-50">
                      {placingBet ? "Placing bets..." : `${t("place_bet")} · ${betSlip.length} selection${betSlip.length > 1 ? "s" : ""}`}
                    </button>
                    {!user && <p className="text-xs text-center text-muted-foreground">You need to <span className="text-primary font-semibold">login</span> to place bets</p>}
                  </div>
                </div>
              )}

              {!slipOpen && (
                <div className="px-4 pb-3 shrink-0">
                  <button onClick={() => { if (!user) { navigate("/login"); return; } setSlipOpen(true); }}
                    className="w-full bg-primary text-primary-foreground font-black py-3 rounded-xl text-sm">
                    {t("place_bet")} · {betSlip.length} selection{betSlip.length > 1 ? "s" : ""}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BetSlipPanel({ betSlip, totalStake, totalPotential, placingBet, successMsg, errorMsg,
  user, t, removeFromSlip, updateAmount, handlePlaceAll, navigate }: {
  betSlip: BetItem[]; totalStake: number; totalPotential: number;
  placingBet: boolean; successMsg: string; errorMsg: string;
  user: any; t: (k: string) => string;
  removeFromSlip: (id: number) => void; updateAmount: (id: number, v: string) => void;
  handlePlaceAll: () => void; navigate: (path: string) => void;
}) {
  return (
    <div className="sticky top-20 bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-primary/10">
        <h2 className="font-black text-foreground text-sm">{t("bet_slip")}</h2>
        {betSlip.length > 0 && <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-black">{betSlip.length}</span>}
      </div>
      {betSlip.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <div className="text-3xl mb-2">🎯</div>
          <div className="text-sm text-muted-foreground">{t("empty_slip")}</div>
          <div className="text-xs text-muted-foreground/60 mt-1">Click any odds to add a bet</div>
        </div>
      ) : (
        <div>
          <div className="max-h-96 overflow-y-auto divide-y divide-border/50">
            {betSlip.map(bet => (
              <div key={bet.eventId} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-foreground truncate">{bet.teamHome} v {bet.teamAway}</div>
                    <div className="text-xs text-primary font-semibold mt-0.5">{bet.label} @ {bet.odds.toFixed(2)}</div>
                  </div>
                  <button onClick={() => removeFromSlip(bet.eventId)} className="w-5 h-5 flex items-center justify-center rounded-full bg-destructive/10 text-destructive text-[10px] shrink-0">✕</button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">TZS</span>
                  <input type="number" value={bet.amount} onChange={e => updateAmount(bet.eventId, e.target.value)}
                    className="flex-1 bg-background border border-input rounded-lg px-2 py-1.5 text-sm text-foreground w-0" min="100" />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Win: <span className="text-primary font-bold">TZS {((parseFloat(bet.amount) || 0) * bet.odds).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 space-y-2 border-t border-border/50">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t("total_stake")}</span>
              <span className="font-bold text-foreground">TZS {totalStake.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Potential Win</span>
              <span className="font-black text-primary">TZS {totalPotential.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            {successMsg && <div className="text-xs text-green-400 bg-green-400/10 rounded-lg px-2 py-1.5">{successMsg}</div>}
            {errorMsg && <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-2 py-1.5">{errorMsg}</div>}
            <button onClick={handlePlaceAll} disabled={placingBet}
              className="w-full bg-primary text-primary-foreground font-black py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
              {placingBet ? "Placing..." : t("place_bet")}
            </button>
            {!user && (
              <button onClick={() => navigate("/login")} className="w-full text-xs text-center text-primary hover:underline">
                {t("login")} to place bets
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
