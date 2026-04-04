import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";

const GOLD  = "#FDD017";
const NAVY  = "#0d1f3c";

type DrawType = "lotto" | "keno" | "pick3" | "spinwin";

const DRAWS: { id: DrawType; label: string; icon: string; desc: string; pick: number; from: number; cost: number; jackpot: number }[] = [
  { id: "lotto",   label: "Tanzania Lotto", icon: "🎱", desc: "Pick 6 from 1–45", pick: 6, from: 45, cost: 500,  jackpot: 50_000_000 },
  { id: "keno",    label: "Keno",           icon: "🎯", desc: "Pick 1–10 from 1–80", pick: 5, from: 80, cost: 200, jackpot: 10_000_000 },
  { id: "pick3",   label: "Pick 3",         icon: "🔢", desc: "Match 3 numbers exactly", pick: 3, from: 9,  cost: 100,  jackpot: 1_000_000  },
  { id: "spinwin", label: "Spin & Win",     icon: "🎡", desc: "Pick 1 lucky number", pick: 1, from: 36, cost: 50,   jackpot: 500_000    },
];

const PAYOUT_TABLES: Record<DrawType, { match: string; prize: string }[]> = {
  lotto: [
    { match: "6/6", prize: "TZS 50,000,000" },
    { match: "5/6", prize: "TZS 500,000" },
    { match: "4/6", prize: "TZS 10,000" },
    { match: "3/6", prize: "TZS 1,000" },
  ],
  keno: [
    { match: "5/5", prize: "TZS 10,000,000" },
    { match: "4/5", prize: "TZS 100,000" },
    { match: "3/5", prize: "TZS 5,000" },
    { match: "2/5", prize: "TZS 500" },
  ],
  pick3: [
    { match: "Exact 3", prize: "TZS 1,000,000" },
    { match: "Any 3",   prize: "TZS 100,000" },
    { match: "Front 2", prize: "TZS 10,000" },
    { match: "Back 2",  prize: "TZS 10,000" },
  ],
  spinwin: [
    { match: "Exact hit", prize: "TZS 500,000" },
    { match: "Colour match", prize: "TZS 5,000" },
    { match: "Odd/Even", prize: "TZS 1,000" },
  ],
};

// Recent draws
const RECENT_DRAWS = [
  [7, 14, 22, 31, 39, 45], [3, 9, 18, 27, 33, 41],
  [1, 11, 20, 28, 35, 44], [5, 13, 24, 30, 38, 43],
];

// Number ball component
function Ball({ n, selected, onClick, size = "md" }: { n: number; selected: boolean; onClick?: () => void; size?: "sm" | "md" }) {
  const s = size === "sm" ? "w-6 h-6 text-[9px]" : "w-9 h-9 text-[11px]";
  return (
    <button
      onClick={onClick}
      className={`${s} rounded-full flex items-center justify-center font-black transition-all active:scale-90`}
      style={{
        background: selected
          ? GOLD
          : "rgba(255,255,255,0.07)",
        color: selected ? "#000" : "rgba(255,255,255,0.6)",
        border: `1px solid ${selected ? GOLD : "rgba(255,255,255,0.1)"}`,
        boxShadow: selected ? `0 0 8px rgba(253,208,23,0.4)` : "none",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {n}
    </button>
  );
}

export default function LuckyNumbersPage() {
  const { user } = useAuth();
  const [activeDraw, setActiveDraw] = useState<DrawType>("lotto");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [tickets, setTickets] = useState(1);

  const draw = DRAWS.find(d => d.id === activeDraw)!;
  const payouts = PAYOUT_TABLES[activeDraw];

  const toggle = (n: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(n)) {
        next.delete(n);
      } else if (next.size < draw.pick) {
        next.add(n);
      }
      return next;
    });
  };

  const quickPick = () => {
    const pool = Array.from({ length: draw.from }, (_, i) => i + 1);
    const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, draw.pick);
    setSelected(new Set(shuffled));
  };

  const clearAll = () => setSelected(new Set());

  const complete = selected.size === draw.pick;
  const totalCost = draw.cost * tickets;

  return (
    <div className="max-w-lg mx-auto" style={{ background: "#0a1628", minHeight: "100vh" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#060d1a", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-2xl">🍀</span>
        <div>
          <div className="text-base font-black text-white">LUCKY NUMBERS</div>
          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Pick your winning numbers</div>
        </div>
        <div className="ml-auto">
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(253,208,23,0.15)", color: GOLD }}>
            Draw every 5 min
          </span>
        </div>
      </div>

      {/* Draw type selector */}
      <div className="flex gap-2 px-3 py-3 overflow-x-auto">
        {DRAWS.map(d => (
          <button
            key={d.id}
            onClick={() => { setActiveDraw(d.id); setSelected(new Set()); }}
            className="shrink-0 flex flex-col items-center px-3 py-2 rounded-xl min-w-[80px] transition-all"
            style={{
              background: activeDraw === d.id ? GOLD : "rgba(255,255,255,0.07)",
              border: `1px solid ${activeDraw === d.id ? GOLD : "rgba(255,255,255,0.08)"}`,
            }}
          >
            <span className="text-xl">{d.icon}</span>
            <span className="text-[9px] font-black mt-0.5" style={{ color: activeDraw === d.id ? "#000" : "rgba(255,255,255,0.7)" }}>{d.label.split(" ").slice(-1)[0]}</span>
          </button>
        ))}
      </div>

      {/* Jackpot banner */}
      <div className="mx-3 mb-3 rounded-2xl py-3 px-4 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg,#1a0d00,#0d1f3c)", border: `1px solid rgba(253,208,23,0.25)` }}>
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-widest">Jackpot</div>
          <div className="text-2xl font-black" style={{ color: GOLD }}>
            TZS {draw.jackpot >= 1_000_000 ? `${(draw.jackpot / 1_000_000).toFixed(0)}M` : draw.jackpot.toLocaleString()}
          </div>
          <div className="text-[10px] text-white/30 mt-0.5">{draw.desc}</div>
        </div>
        <div className="text-4xl">{draw.icon}</div>
      </div>

      {/* Number grid */}
      <div className="mx-3 rounded-2xl p-4 mb-3" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-black text-white">
            Select {draw.pick} numbers
            <span className="ml-2 text-[11px] font-normal" style={{ color: "rgba(255,255,255,0.35)" }}>({selected.size}/{draw.pick})</span>
          </div>
          <div className="flex gap-2">
            <button onClick={quickPick} className="text-[10px] font-black px-2.5 py-1 rounded-lg" style={{ background: "rgba(253,208,23,0.12)", color: GOLD }}>
              ⚡ Quick Pick
            </button>
            <button onClick={clearAll} className="text-[10px] font-black px-2.5 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
              Clear
            </button>
          </div>
        </div>

        {/* Number pool */}
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: draw.from }, (_, i) => i + 1).map(n => (
            <Ball
              key={n}
              n={n}
              selected={selected.has(n)}
              onClick={() => toggle(n)}
              size={draw.from > 45 ? "sm" : "md"}
            />
          ))}
        </div>

        {/* Selected preview */}
        {selected.size > 0 && (
          <div className="mt-3 pt-3 flex items-center gap-2 flex-wrap" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-[10px] text-white/40">Your picks:</span>
            {[...selected].sort((a, b) => a - b).map(n => (
              <Ball key={n} n={n} selected size="sm" />
            ))}
          </div>
        )}
      </div>

      {/* Tickets & cost */}
      <div className="mx-3 rounded-2xl p-4 mb-3" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-black text-white">Number of Tickets</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setTickets(t => Math.max(1, t - 1))}
              className="w-8 h-8 rounded-full flex items-center justify-center font-black text-lg"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>−</button>
            <span className="text-base font-black text-white w-6 text-center">{tickets}</span>
            <button onClick={() => setTickets(t => Math.min(10, t + 1))}
              className="w-8 h-8 rounded-full flex items-center justify-center font-black text-lg"
              style={{ background: GOLD, color: "#000" }}>+</button>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/40">Per ticket: TZS {draw.cost.toLocaleString()}</span>
          <span className="font-black" style={{ color: GOLD }}>Total: TZS {totalCost.toLocaleString()}</span>
        </div>
      </div>

      {/* Payout table */}
      <div className="mx-3 rounded-2xl overflow-hidden mb-3" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span>💰</span>
          <span className="text-xs font-black text-white">Prize Tiers</span>
        </div>
        {payouts.map((p, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span className="text-xs text-white/60">{p.match}</span>
            <span className="text-xs font-black" style={{ color: GOLD }}>{p.prize}</span>
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="mx-3 mb-4">
        {complete ? (
          user ? (
            <button
              className="w-full py-4 rounded-2xl text-sm font-black text-black"
              style={{ background: GOLD, boxShadow: "0 4px 20px rgba(253,208,23,0.3)" }}
            >
              🍀 Play Now · TZS {totalCost.toLocaleString()}
            </button>
          ) : (
            <Link href="/login" className="block w-full py-4 rounded-2xl text-sm font-black text-center text-black" style={{ background: GOLD }}>
              Login to Play
            </Link>
          )
        ) : (
          <div className="w-full py-4 rounded-2xl text-sm font-black text-center"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.07)" }}>
            Pick {draw.pick - selected.size} more number{draw.pick - selected.size !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Recent draws */}
      <div className="mx-3 rounded-2xl overflow-hidden mb-8" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span>📋</span>
          <span className="text-xs font-black text-white">Recent Draws</span>
        </div>
        {RECENT_DRAWS.map((balls, i) => (
          <div key={i} className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span className="text-[10px] text-white/30 w-8">#{4 - i}</span>
            <div className="flex gap-1 flex-wrap">
              {balls.slice(0, draw.pick).map(n => (
                <Ball key={n} n={n} selected={false} size="sm" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
