import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";

const GOLD = "#FDD017";
const GREEN = "#1B8A3C";

type Pool = {
  id: string; name: string; prize: number;
  matches: number; perTicket: number; jackpotType: string;
  color: string; icon: string; deadline: string;
};

const POOLS: Pool[] = [
  {
    id: "mega", name: "MEGA JACKPOT", prize: 500_000_000,
    matches: 17, perTicket: 100, jackpotType: "Predict all 17 correct scores",
    color: "#e63946", icon: "🏆", deadline: "Sun 20:00",
  },
  {
    id: "midweek", name: "MIDWEEK JACKPOT", prize: 100_000_000,
    matches: 13, perTicket: 50, jackpotType: "Predict all 13 results",
    color: "#9c27b0", icon: "💜", deadline: "Wed 22:00",
  },
  {
    id: "super", name: "SUPER JACKPOT", prize: 25_000_000,
    matches: 10, perTicket: 25, jackpotType: "Predict all 10 results",
    color: "#ff9800", icon: "⚡", deadline: "Sat 14:00",
  },
  {
    id: "daily", name: "DAILY JACKPOT", prize: 5_000_000,
    matches: 5, perTicket: 10, jackpotType: "Predict all 5 results",
    color: "#4caf50", icon: "🌟", deadline: "Daily 18:00",
  },
];

const JP_MATCHES = [
  ["Arsenal", "Chelsea"], ["Barcelona", "Real Madrid"], ["PSG", "Lyon"],
  ["Bayern", "Dortmund"], ["Juventus", "Milan"], ["Liverpool", "ManCity"],
  ["Atletico", "Sevilla"], ["Porto", "Benfica"], ["Ajax", "Feyenoord"],
  ["Celtic", "Rangers"], ["Galatasaray", "Fenerbahce"], ["Flamengo", "Palmeiras"],
  ["Simba", "Yanga"], ["Gor Mahia", "AFC Leopards"], ["Kaizer Chiefs", "Orlando Pirates"],
  ["Al Ahly", "Zamalek"], ["Wydad", "Raja"],
];

type Pick = Record<number, "1" | "X" | "2">;

export default function JackpotPage() {
  const { user } = useAuth();
  const [selectedPool, setSelectedPool] = useState<Pool>(POOLS[0]!);
  const [picks, setPicks] = useState<Pick>({});

  const matches = JP_MATCHES.slice(0, selectedPool.matches);
  const filled = Object.keys(picks).length;
  const complete = filled === selectedPool.matches;

  const setPick = (idx: number, val: "1" | "X" | "2") => {
    setPicks(p => ({ ...p, [idx]: val }));
  };

  return (
    <div className="max-w-lg mx-auto" style={{ background: "#0a1628", minHeight: "100vh" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#060d1a", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-2xl">🎰</span>
        <div>
          <div className="text-base font-black text-white">JACKPOTS</div>
          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Win life-changing prizes</div>
        </div>
      </div>

      {/* Pool cards */}
      <div className="px-3 py-4 space-y-3">
        {POOLS.map(pool => (
          <button
            key={pool.id}
            onClick={() => { setSelectedPool(pool); setPicks({}); }}
            className="w-full rounded-2xl p-4 text-left transition-all"
            style={{
              background: selectedPool.id === pool.id
                ? `linear-gradient(135deg, ${pool.color}22, #111827)`
                : "#111827",
              border: `1px solid ${selectedPool.id === pool.id ? pool.color + "60" : "rgba(255,255,255,0.06)"}`,
              boxShadow: selectedPool.id === pool.id ? `0 0 20px ${pool.color}20` : "none",
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{pool.icon}</span>
                <div>
                  <div className="text-sm font-black text-white">{pool.name}</div>
                  <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {pool.matches} matches · TZS {pool.perTicket.toLocaleString()}/ticket
                  </div>
                </div>
              </div>
              {selectedPool.id === pool.id && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: pool.color + "30", color: pool.color }}>SELECTED</span>
              )}
            </div>
            <div className="mt-2.5 flex items-end justify-between">
              <div>
                <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Jackpot Prize</div>
                <div className="text-xl font-black" style={{ color: pool.color }}>
                  TZS {pool.prize >= 1_000_000 ? `${(pool.prize / 1_000_000).toFixed(0)}M` : pool.prize.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Closes</div>
                <div className="text-xs font-bold text-white">{pool.deadline}</div>
              </div>
            </div>
            {/* Prize tiers */}
            <div className="flex gap-2 mt-2.5 flex-wrap">
              {[
                { label: `All ${pool.matches}`, prize: pool.prize },
                { label: `${pool.matches - 1} correct`, prize: Math.floor(pool.prize * 0.15) },
                { label: `${pool.matches - 2} correct`, prize: Math.floor(pool.prize * 0.05) },
              ].map(t => (
                <div key={t.label} className="px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="text-[8px] text-white/40">{t.label}</div>
                  <div className="text-[10px] font-black text-white">
                    TZS {t.prize >= 1_000_000 ? `${(t.prize / 1_000_000).toFixed(1)}M` : t.prize.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Match predictions */}
      <div className="px-3 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-black text-white">Make Your Predictions</div>
          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{filled}/{selectedPool.matches} filled</div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full mb-3 overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(filled / selectedPool.matches) * 100}%`, background: complete ? "#4ade80" : GOLD }}
          />
        </div>

        <div className="space-y-2">
          {matches.map(([h, a], i) => (
            <div key={i} className="rounded-xl px-3 py-2.5" style={{ background: "#111827", border: `1px solid ${picks[i] ? "rgba(253,208,23,0.2)" : "rgba(255,255,255,0.06)"}` }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>{i + 1}</span>
                <span className="text-xs text-white flex-1 font-semibold">{h} <span className="text-white/30">vs</span> {a}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(["1", "X", "2"] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setPick(i, v)}
                    className="py-1.5 rounded-lg text-xs font-black transition-all"
                    style={{
                      background: picks[i] === v ? GOLD : "rgba(255,255,255,0.05)",
                      color: picks[i] === v ? "#000" : "rgba(255,255,255,0.5)",
                      border: picks[i] === v ? "none" : "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {v === "1" ? "Home" : v === "X" ? "Draw" : "Away"}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="mt-4">
          {complete ? (
            user ? (
              <button
                className="w-full py-4 rounded-2xl text-sm font-black text-black transition-all"
                style={{ background: GOLD, boxShadow: `0 4px 20px rgba(253,208,23,0.3)` }}
              >
                🎰 Submit Ticket · TZS {selectedPool.perTicket.toLocaleString()}
              </button>
            ) : (
              <Link href="/login" className="block w-full py-4 rounded-2xl text-sm font-black text-center text-black" style={{ background: GOLD }}>
                Login to Submit
              </Link>
            )
          ) : (
            <div
              className="w-full py-4 rounded-2xl text-sm font-black text-center"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              Pick all {selectedPool.matches} matches to submit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
