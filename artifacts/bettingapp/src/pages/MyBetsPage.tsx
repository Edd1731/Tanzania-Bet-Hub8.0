import { useState } from "react";
import { useGetMyBets, getGetMyBetsQueryKey } from "@workspace/api-client-react";
import { useTranslation } from "@/hooks/use-translation";

const GOLD  = "#FDD017";
const NAVY  = "#0d1f3c";
const NAVY2 = "#0a1628";
const GREEN = "#1B8A3C";

// ─── Readable choice label ──────────────────────────────────────────────────
function choiceLabel(choice: string): string {
  const map: Record<string, string> = {
    home: "1 · Home Win", draw: "X · Draw", away: "2 · Away Win",
    dc_1x: "DC · 1X (Home or Draw)", dc_x2: "DC · X2 (Draw or Away)", dc_12: "DC · 12 (Home or Away)",
    ou_o15: "Over 1.5 Goals",  ou_u15: "Under 1.5 Goals",
    ou_o25: "Over 2.5 Goals",  ou_u25: "Under 2.5 Goals",
    ou_o35: "Over 3.5 Goals",  ou_u35: "Under 3.5 Goals",
    btts_yes: "BTTS · Yes",    btts_no: "BTTS · No",
    ht_h: "HT · Home Win",     ht_d: "HT · Draw",        ht_a: "HT · Away Win",
    ht_o05: "HT Over 0.5",     ht_u05: "HT Under 0.5",
    ht_o15: "HT Over 1.5",     ht_u15: "HT Under 1.5",
    wtn_h: "Home Win to Nil",  wtn_a: "Away Win to Nil",
    btr_b1: "BTTS + Home Win", btr_bx: "BTTS + Draw",    btr_b2: "BTTS + Away Win",
    btr_n1: "No BTTS + Home",  btr_nx: "No BTTS + Draw", btr_n2: "No BTTS + Away",
  };
  if (map[choice]) return map[choice]!;

  // Correct Score: cs_10 → "CS · 1 - 0"
  if (choice.startsWith("cs_")) {
    const code = choice.slice(3);
    const h = code[0] ?? "?";
    const a = code.slice(1) || "?";
    return `Correct Score · ${h} - ${a}`;
  }

  // HT/FT: htft_1x → "HT/FT · 1 / X"
  if (choice.startsWith("htft_")) {
    const code = choice.slice(5).toUpperCase();
    const ht = code[0] ?? "?";
    const ft = code[1] ?? "?";
    return `HT/FT · ${ht} / ${ft}`;
  }

  // Asian Handicap: ah_h-0.5 → "AH Home -0.5"
  if (choice.startsWith("ah_h")) return `Asian Handicap Home ${choice.slice(4)}`;
  if (choice.startsWith("ah_a")) return `Asian Handicap Away ${choice.slice(4)}`;

  return choice;
}

// ─── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    won:     "bg-green-500/15  text-green-400  border-green-500/30",
    lost:    "bg-red-500/15    text-red-400    border-red-500/30",
  };
  const labels: Record<string, string> = {
    pending: "Pending", won: "Won", lost: "Lost",
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${styles[status] ?? "bg-white/10 text-white/60 border-white/10"}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ─── Individual bet card ────────────────────────────────────────────────────
function BetCard({ bet }: { bet: any }) {
  const [open, setOpen] = useState(false);

  const event   = bet.event;
  const matchName = event ? `${event.teamHome} vs ${event.teamAway}` : "Unknown Match";
  const odds    = bet.potentialWin && bet.amount ? (bet.potentialWin / bet.amount) : 0;
  const dateStr = bet.createdAt ? new Date(bet.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  }) : "—";
  const timeStr = bet.createdAt ? new Date(bet.createdAt).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit",
  }) : "";

  // Live score or settled result
  const scoreStr = (event?.scoreHome != null && event?.scoreAway != null)
    ? `${event.scoreHome} - ${event.scoreAway}`
    : null;

  const isLive    = event?.status === "live";
  const isSettled = event?.status === "finished" || bet.status !== "pending";

  return (
    <div
      style={{
        background: open ? "#0f1e35" : "#111827",
        border: `1px solid ${open ? "rgba(253,208,23,0.25)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: "14px",
        overflow: "hidden",
        transition: "background 0.2s, border-color 0.2s",
      }}
    >
      {/* ── Collapsed header (always visible) ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left"
        aria-expanded={open}
      >
        <div className="px-4 pt-3.5 pb-3 flex items-start gap-3">
          {/* Status indicator strip */}
          <div
            className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
            style={{
              background: bet.status === "won" ? "#22c55e"
                : bet.status === "lost" ? "#ef4444"
                : GOLD,
            }}
          />

          <div className="flex-1 min-w-0">
            {/* Match name + league */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-white text-sm truncate">{matchName}</span>
              <StatusBadge status={bet.status} />
            </div>

            {/* League + choice */}
            <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
              {event?.league ?? "Unknown League"}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                style={{ background: "rgba(253,208,23,0.12)", color: GOLD }}
              >
                {choiceLabel(bet.choice)}
              </span>
              <span className="text-[11px] font-black text-white">@ {odds.toFixed(2)}</span>
              {isLive && scoreStr && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: "#DC2626", color: "#fff" }}>
                  🔴 LIVE {scoreStr}
                </span>
              )}
            </div>

            {/* Stake + potential */}
            <div className="flex items-center gap-4 mt-2">
              <div>
                <span className="text-[10px] block" style={{ color: "rgba(255,255,255,0.35)" }}>Stake</span>
                <span className="text-xs font-bold text-white">TZS {Number(bet.amount).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] block" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {bet.status === "won" ? "Won" : "Potential Win"}
                </span>
                <span
                  className="text-xs font-black"
                  style={{ color: bet.status === "won" ? "#22c55e" : GOLD }}
                >
                  TZS {Number(bet.potentialWin).toLocaleString()}
                </span>
              </div>
              <div className="ml-auto text-right">
                <span className="text-[10px] block" style={{ color: "rgba(255,255,255,0.35)" }}>{dateStr}</span>
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>{timeStr}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Expand toggle */}
        <div
          className="flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold"
          style={{
            color: "rgba(255,255,255,0.3)",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <span>{open ? "Hide details" : "Show details"}</span>
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          >
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>
      </button>

      {/* ── Expanded details ── */}
      {open && (
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(0,0,0,0.25)",
          }}
        >
          {/* Section: Bet reference */}
          <DetailRow label="Bet Reference" value={`#${String(bet.id).padStart(7, "0")}`} mono />

          {/* Section: Market */}
          <DetailRow label="Market" value={choiceLabel(bet.choice)} />

          {/* Section: Odds */}
          <DetailRow label="Odds" value={odds.toFixed(2)} highlight />

          {/* Section: Match details */}
          {event && (
            <>
              <div className="px-4 pt-3 pb-1">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>
                  Match Info
                </span>
              </div>
              <DetailRow label="Home Team" value={event.teamHome} />
              <DetailRow label="Away Team" value={event.teamAway} />
              <DetailRow label="Competition" value={event.league ?? "—"} />
              {event.kickoff && (
                <DetailRow
                  label="Kick-off"
                  value={new Date(event.kickoff).toLocaleString("en-GB", {
                    weekday: "short", day: "2-digit", month: "short",
                    hour: "2-digit", minute: "2-digit",
                  })}
                />
              )}
              {scoreStr && (
                <DetailRow
                  label={isLive ? "Live Score" : "Final Score"}
                  value={scoreStr}
                  highlight={isLive}
                  live={isLive}
                />
              )}
              <DetailRow
                label="Match Status"
                value={
                  isLive ? "In Progress" :
                  event.status === "finished" ? "Finished" :
                  event.status === "active" ? "Upcoming" : event.status ?? "—"
                }
              />
            </>
          )}

          {/* Section: Financial */}
          <div className="px-4 pt-3 pb-1">
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>
              Settlement
            </span>
          </div>
          <DetailRow label="Stake" value={`TZS ${Number(bet.amount).toLocaleString()}`} />
          <DetailRow
            label={bet.status === "won" ? "Winnings" : "Potential Win"}
            value={`TZS ${Number(bet.potentialWin).toLocaleString()}`}
            highlight={bet.status === "won"}
          />
          {bet.status === "won" && (
            <DetailRow
              label="Net Profit"
              value={`TZS ${(Number(bet.potentialWin) - Number(bet.amount)).toLocaleString()}`}
              highlight
            />
          )}
          <DetailRow
            label="Result"
            value={bet.status === "won" ? "✓ Won" : bet.status === "lost" ? "✗ Lost" : "⏳ Pending"}
          />
          <DetailRow label="Placed On" value={`${dateStr} at ${timeStr}`} />

          {/* Settled indicator for won/lost */}
          {bet.status !== "pending" && (
            <div
              className="mx-4 my-3 rounded-xl py-3 flex items-center justify-center gap-2"
              style={{
                background: bet.status === "won"
                  ? "rgba(34,197,94,0.1)"
                  : "rgba(239,68,68,0.1)",
                border: `1px solid ${bet.status === "won" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
              }}
            >
              <span className="text-lg">{bet.status === "won" ? "🏆" : "❌"}</span>
              <div>
                <div
                  className="text-sm font-black"
                  style={{ color: bet.status === "won" ? "#22c55e" : "#ef4444" }}
                >
                  {bet.status === "won" ? "Bet Won!" : "Bet Lost"}
                </div>
                {bet.status === "won" && (
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                    TZS {Number(bet.potentialWin).toLocaleString()} credited to your wallet
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="h-2" />
        </div>
      )}
    </div>
  );
}

// ─── Detail row helper ──────────────────────────────────────────────────────
function DetailRow({
  label, value, highlight = false, mono = false, live = false,
}: {
  label: string; value: string; highlight?: boolean; mono?: boolean; live?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
      <span
        className={`text-[11px] font-bold ${mono ? "font-mono" : ""} ${live ? "animate-pulse" : ""}`}
        style={{ color: highlight ? GOLD : "rgba(255,255,255,0.85)" }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Summary bar ───────────────────────────────────────────────────────────
function SummaryBar({ bets }: { bets: any[] }) {
  const won     = bets.filter(b => b.status === "won").length;
  const lost    = bets.filter(b => b.status === "lost").length;
  const pending = bets.filter(b => b.status === "pending").length;
  const totalWon = bets.filter(b => b.status === "won").reduce((s, b) => s + Number(b.potentialWin), 0);

  return (
    <div
      className="rounded-2xl px-4 py-3 mb-5 grid grid-cols-4 gap-2"
      style={{ background: NAVY, border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <SummaryCell label="Total" value={String(bets.length)} color="rgba(255,255,255,0.85)" />
      <SummaryCell label="Pending" value={String(pending)} color={GOLD} />
      <SummaryCell label="Won" value={String(won)} color="#22c55e" />
      <SummaryCell label="Lost" value={String(lost)} color="#ef4444" />
      {totalWon > 0 && (
        <div className="col-span-4 pt-2 mt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Total Winnings: </span>
          <span className="text-xs font-black" style={{ color: "#22c55e" }}>TZS {totalWon.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

function SummaryCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-base font-black" style={{ color }}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function MyBetsPage() {
  const { t } = useTranslation();
  const { data: bets, isLoading } = useGetMyBets({ query: { queryKey: getGetMyBetsQueryKey() } });
  const [filter, setFilter] = useState<"all" | "pending" | "won" | "lost">("all");

  const sorted   = [...(bets ?? [])].reverse();
  const filtered = filter === "all" ? sorted : sorted.filter(b => b.status === filter);

  return (
    <div className="max-w-xl mx-auto px-3 py-5">
      {/* Page heading */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black text-white">{t("my_bets")}</h1>
        {bets && bets.length > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
            {bets.length} bet{bets.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: "#111827" }} />
          ))}
        </div>
      ) : bets?.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-5xl mb-4">🎫</div>
          <div className="text-base font-black text-white mb-1">{t("no_bets")}</div>
          <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            Place your first bet to see it here
          </div>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <SummaryBar bets={bets ?? []} />

          {/* Filter tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {(["all", "pending", "won", "lost"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0 transition-all"
                style={{
                  background: filter === f ? GOLD : "rgba(255,255,255,0.08)",
                  color: filter === f ? "#000" : "rgba(255,255,255,0.55)",
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {" "}
                {f === "all" ? `(${sorted.length})` : `(${sorted.filter(b => b.status === f).length})`}
              </button>
            ))}
          </div>

          {/* Bet cards */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
              No {filter} bets
            </div>
          ) : (
            <div className="space-y-3 pb-24">
              {filtered.map(bet => (
                <BetCard key={bet.id} bet={bet} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
