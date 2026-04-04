import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";

const GOLD  = "#FDD017";
const NAVY  = "#0d1f3c";
const RED   = "#e63946";

// ── Realistic crash-point generator (Bustabit-style provably fair curve) ──
function genCrashPoint(): number {
  const r = Math.random();
  if (r < 0.04) return 1.00; // 4% instant bust
  return Math.max(1.00, parseFloat((1 / (1 - r * 0.97)).toFixed(2)));
}

// ── Recent bets simulation ──
const BOT_NAMES = [
  "Juma***", "Aisha***", "Peter***", "Grace***", "Hassan***",
  "Mercy***", "Ali***", "Faith***", "John***", "Zara***",
  "Mwangi***", "Amina***", "David***", "Lilian***", "Omar***",
];
function randBet() {
  return Math.floor(Math.random() * 18 + 2) * 5_000;
}
function randCashout() {
  return parseFloat((1.2 + Math.random() * 8).toFixed(2));
}

type Phase = "waiting" | "flying" | "crashed";
type LivePlayer = { name: string; bet: number; cashout: number | null; cashedOut: boolean; cashedAt?: number };

// ── SVG Plane ──
function Plane({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path d="M8 36L56 12L44 52L28 40L8 36Z" fill={GOLD} opacity="0.95"/>
      <path d="M28 40L32 56L40 44L28 40Z" fill={GOLD} opacity="0.7"/>
      <path d="M8 36L20 32L28 40L8 36Z" fill={GOLD} opacity="0.6"/>
      <circle cx="42" cy="22" r="3" fill="white" opacity="0.6"/>
    </svg>
  );
}

export default function AviatorPage() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("waiting");
  const [multiplier, setMultiplier] = useState(1.00);
  const [crashAt, setCrashAt] = useState(1.00);
  const [countdown, setCountdown] = useState(5);
  const [betAmount, setBetAmount] = useState("10000");
  const [autoCashout, setAutoCashout] = useState("2.00");
  const [placed, setPlaced] = useState(false);
  const [cashedOut, setCashedOut] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([1.24, 3.41, 1.00, 8.72, 1.53, 2.01, 1.00, 14.3, 1.83, 5.5]);
  const [players, setPlayers] = useState<LivePlayer[]>(() =>
    BOT_NAMES.slice(0, 8).map(name => ({ name, bet: randBet(), cashout: randCashout(), cashedOut: false }))
  );
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Generate new round
  const newRound = useCallback(() => {
    const cp = genCrashPoint();
    setCrashAt(cp);
    setMultiplier(1.00);
    setPhase("waiting");
    setCountdown(5);
    setPlaced(false);
    setCashedOut(null);
    setPlayers(BOT_NAMES.slice(0, Math.floor(6 + Math.random() * 6)).map(name => ({
      name, bet: randBet(), cashout: randCashout(), cashedOut: false,
    })));
  }, []);

  // Countdown → flying
  useEffect(() => {
    if (phase !== "waiting") return;
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(t);
          setPhase("flying");
          startTimeRef.current = Date.now();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Flying → crash
  useEffect(() => {
    if (phase !== "flying") return;
    tickRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const m = parseFloat(Math.pow(Math.E, 0.06 * elapsed).toFixed(2));

      setMultiplier(m);

      // Auto-cashout bots
      setPlayers(prev => prev.map(p => {
        if (!p.cashedOut && p.cashout && m >= p.cashout) {
          return { ...p, cashedOut: true, cashedAt: p.cashout };
        }
        return p;
      }));

      // Player auto-cashout
      const ac = parseFloat(autoCashout);
      if (placed && !cashedOut && !isNaN(ac) && m >= ac) {
        setCashedOut(ac);
      }

      if (m >= crashAt) {
        clearInterval(tickRef.current!);
        setMultiplier(crashAt);
        setPhase("crashed");
        setHistory(h => [crashAt, ...h.slice(0, 19)]);
        setTimeout(newRound, 4000);
      }
    }, 100);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [phase, crashAt, placed, cashedOut, autoCashout, newRound]);

  const handlePlaceBet = () => {
    if (phase !== "waiting" || placed) return;
    setPlaced(true);
  };

  const handleCashout = () => {
    if (phase !== "flying" || !placed || cashedOut) return;
    setCashedOut(multiplier);
  };

  const winAmount = cashedOut && placed
    ? Math.floor(parseFloat(betAmount) * cashedOut)
    : null;

  // Plane position along a curve
  const planeX = phase === "flying" || phase === "crashed"
    ? Math.min(75, ((multiplier - 1) / (crashAt - 1)) * 75)
    : 0;
  const planeY = phase === "flying" || phase === "crashed"
    ? Math.max(5, 80 - ((multiplier - 1) / (crashAt - 1)) * 70)
    : 80;

  return (
    <div className="max-w-lg mx-auto" style={{ background: "#0a0f1e", minHeight: "100vh" }}>

      {/* ── Header ── */}
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#060d1a", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-2xl">✈️</span>
        <div>
          <div className="text-base font-black text-white tracking-wide">AVIATOR</div>
          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Crash Multiplier Game</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22c55e" }} />
          <span className="text-[10px] text-white/40">LIVE</span>
        </div>
      </div>

      {/* ── Crash history ── */}
      <div className="flex gap-1.5 px-3 py-2 overflow-x-auto" style={{ background: "#080d1c" }}>
        {history.map((h, i) => (
          <span
            key={i}
            className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{
              background: h < 1.5 ? "rgba(220,39,39,0.2)" : h < 3 ? "rgba(253,208,23,0.15)" : "rgba(34,197,94,0.15)",
              color: h < 1.5 ? "#f87171" : h < 3 ? GOLD : "#4ade80",
              border: `1px solid ${h < 1.5 ? "rgba(220,39,39,0.3)" : h < 3 ? "rgba(253,208,23,0.25)" : "rgba(34,197,94,0.25)"}`,
            }}
          >
            {h.toFixed(2)}x
          </span>
        ))}
      </div>

      {/* ── Game canvas ── */}
      <div
        className="mx-3 mt-3 rounded-2xl overflow-hidden relative"
        style={{ background: "linear-gradient(180deg, #0a1628 0%, #060d1a 100%)", border: "1px solid rgba(255,255,255,0.07)", height: "200px" }}
      >
        {/* Grid lines */}
        {[20, 40, 60, 80].map(y => (
          <div key={y} className="absolute left-0 right-0" style={{ top: `${y}%`, borderTop: "1px dashed rgba(255,255,255,0.04)" }} />
        ))}
        {[25, 50, 75].map(x => (
          <div key={x} className="absolute top-0 bottom-0" style={{ left: `${x}%`, borderLeft: "1px dashed rgba(255,255,255,0.04)" }} />
        ))}

        {/* Curve */}
        {(phase === "flying" || phase === "crashed") && (
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="curveGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={phase === "crashed" ? RED : GOLD} stopOpacity="0.8"/>
                <stop offset="100%" stopColor={phase === "crashed" ? RED : GOLD} stopOpacity="0.2"/>
              </linearGradient>
            </defs>
            <path
              d={`M 0,190 Q ${planeX * 2},${planeY * 2} ${planeX * 2.5},${planeY * 2}`}
              stroke={phase === "crashed" ? RED : GOLD}
              strokeWidth="2"
              fill="none"
              opacity="0.6"
            />
          </svg>
        )}

        {/* Multiplier display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {phase === "waiting" && (
            <div className="text-center">
              <div className="text-xs text-white/40 mb-1">Next round in</div>
              <div className="text-5xl font-black" style={{ color: GOLD }}>{countdown}s</div>
              <div className="text-xs text-white/30 mt-1">Place your bets!</div>
            </div>
          )}
          {phase === "flying" && (
            <div className="text-center">
              <div
                className="font-black tabular-nums transition-all"
                style={{
                  fontSize: multiplier >= 10 ? "52px" : "64px",
                  color: multiplier >= 5 ? "#4ade80" : multiplier >= 2 ? GOLD : "white",
                  textShadow: `0 0 30px ${multiplier >= 5 ? "rgba(74,222,128,0.4)" : "rgba(253,208,23,0.4)"}`,
                }}
              >
                {multiplier.toFixed(2)}x
              </div>
              {/* Flying plane */}
              <div
                className="absolute transition-all duration-100"
                style={{ left: `${planeX}%`, top: `${planeY}%`, transform: "translate(-50%,-50%) rotate(-25deg)" }}
              >
                <Plane size={40} />
              </div>
            </div>
          )}
          {phase === "crashed" && (
            <div className="text-center">
              <div className="text-sm font-black mb-1" style={{ color: RED }}>CRASHED AT</div>
              <div className="text-5xl font-black" style={{ color: RED }}>{crashAt.toFixed(2)}x</div>
              {placed && !cashedOut && (
                <div className="text-xs text-red-400 mt-2">Better luck next time!</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Win banner ── */}
      {cashedOut && phase !== "crashed" && (
        <div className="mx-3 mt-2 rounded-xl py-2 px-4 flex items-center justify-between"
          style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)" }}>
          <span className="text-sm font-bold text-green-400">Cashed out @ {cashedOut.toFixed(2)}x</span>
          <span className="text-sm font-black text-green-400">+TZS {winAmount?.toLocaleString()}</span>
        </div>
      )}

      {/* ── Bet controls ── */}
      <div className="mx-3 mt-3 rounded-2xl p-4" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Bet amount */}
          <div>
            <div className="text-[10px] text-white/40 mb-1 uppercase tracking-widest">Bet Amount (TZS)</div>
            <div className="relative">
              <input
                type="number"
                value={betAmount}
                onChange={e => setBetAmount(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl text-sm font-bold text-white outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                disabled={placed && phase !== "waiting"}
              />
            </div>
            <div className="flex gap-1 mt-1.5">
              {[5_000, 10_000, 50_000].map(v => (
                <button key={v} onClick={() => setBetAmount(String(v))}
                  className="flex-1 text-[9px] font-black py-1 rounded-lg"
                  style={{ background: "rgba(253,208,23,0.1)", color: GOLD }}>
                  {v >= 1000 ? `${v/1000}K` : v}
                </button>
              ))}
            </div>
          </div>
          {/* Auto cashout */}
          <div>
            <div className="text-[10px] text-white/40 mb-1 uppercase tracking-widest">Auto Cashout (x)</div>
            <input
              type="number"
              value={autoCashout}
              step="0.1"
              min="1.1"
              onChange={e => setAutoCashout(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl text-sm font-bold text-white outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              disabled={placed && phase !== "waiting"}
            />
            <div className="flex gap-1 mt-1.5">
              {["1.5", "2.0", "5.0"].map(v => (
                <button key={v} onClick={() => setAutoCashout(v)}
                  className="flex-1 text-[9px] font-black py-1 rounded-lg"
                  style={{ background: "rgba(253,208,23,0.1)", color: GOLD }}>
                  {v}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action button */}
        {!user ? (
          <Link href="/login" className="block w-full py-3.5 rounded-xl text-sm font-black text-center text-black" style={{ background: GOLD }}>
            Login to Play
          </Link>
        ) : phase === "waiting" ? (
          <button
            onClick={handlePlaceBet}
            disabled={placed}
            className="w-full py-3.5 rounded-xl text-sm font-black transition-all"
            style={{
              background: placed ? "rgba(74,222,128,0.2)" : GOLD,
              color: placed ? "#4ade80" : "#000",
              border: placed ? "1px solid rgba(74,222,128,0.4)" : "none",
            }}
          >
            {placed ? "✓ Bet Placed — Waiting..." : `Place Bet · TZS ${Number(betAmount).toLocaleString()}`}
          </button>
        ) : phase === "flying" ? (
          <button
            onClick={handleCashout}
            disabled={!placed || !!cashedOut}
            className="w-full py-3.5 rounded-xl text-sm font-black transition-all"
            style={{
              background: !placed ? "rgba(255,255,255,0.05)" : cashedOut ? "rgba(74,222,128,0.15)" : "#22c55e",
              color: !placed ? "rgba(255,255,255,0.3)" : cashedOut ? "#4ade80" : "#fff",
              cursor: !placed || cashedOut ? "default" : "pointer",
            }}
          >
            {!placed ? "No bet placed" : cashedOut ? `✓ Cashed out @ ${cashedOut.toFixed(2)}x` : `💰 Cash Out · TZS ${Math.floor(parseFloat(betAmount) * multiplier).toLocaleString()}`}
          </button>
        ) : (
          <button disabled className="w-full py-3.5 rounded-xl text-sm font-black" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }}>
            Round ended — Next in 4s
          </button>
        )}
      </div>

      {/* ── Live players ── */}
      <div className="mx-3 mt-3 rounded-2xl overflow-hidden mb-4" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white">Live Players</span>
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{players.length} betting</span>
          </div>
        </div>
        <div>
          {players.map((p, i) => (
            <div key={i} className="flex items-center px-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-black mr-2.5" style={{ background: GOLD }}>
                {p.name[0]}
              </div>
              <span className="text-xs text-white/70 flex-1">{p.name}</span>
              <span className="text-xs text-white/50 mr-3">TZS {p.bet.toLocaleString()}</span>
              {p.cashedOut ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}>
                  {p.cashedAt?.toFixed(2)}x
                </span>
              ) : phase === "crashed" ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                  lost
                </span>
              ) : (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(253,208,23,0.1)", color: GOLD }}>
                  {phase === "flying" ? `${multiplier.toFixed(2)}x` : "waiting"}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
