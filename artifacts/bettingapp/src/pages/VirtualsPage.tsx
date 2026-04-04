import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";

const GOLD  = "#FDD017";
const NAVY  = "#0d1f3c";
const GREEN = "#1B8A3C";

type VSport = "football" | "horses" | "dogs" | "basketball" | "cycling";

const SPORTS: { id: VSport; label: string; icon: string; interval: number }[] = [
  { id: "football",   label: "Virtual Football",   icon: "⚽", interval: 180 },
  { id: "horses",     label: "Horse Racing",        icon: "🏇", interval: 120 },
  { id: "dogs",       label: "Greyhound Racing",    icon: "🐕", interval: 90  },
  { id: "basketball", label: "Virtual Basketball",  icon: "🏀", interval: 150 },
  { id: "cycling",    label: "Virtual Cycling",     icon: "🚴", interval: 60  },
];

const FOOTBALL_TEAMS = [
  ["Simba SC", "Young Africans"],["Dynamo", "Atletico"],["Red Stars", "Blue Eagles"],
  ["City United", "Town FC"],["Northern Knights", "Southern Lions"],["Rovers", "Rangers"],
  ["Victoria FC", "Rapids"],["Phoenix", "Storm City"],
];
const HORSE_NAMES = ["Lightning Bolt", "Black Pearl", "Desert Wind", "Golden Arrow", "Iron Horse", "Silver Streak", "Night Fury", "Thunder Bay"];
const DOG_NAMES   = ["Flash", "Rocket", "Blaze", "Shadow", "Storm", "Bullet", "Turbo", "Ace"];
const NBA_TEAMS   = [["Heat Ballers", "Sky Rockets"],["Dunkers", "Swishers"],["Nets United", "Fast Breakers"],["Court Kings", "Rim Rockers"]];

function randOdds(base = 1.5, spread = 3): string {
  return (base + Math.random() * spread).toFixed(2);
}

function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    const t = setInterval(() => setLeft(s => s <= 1 ? seconds : s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);
  return left;
}

// ── Virtual Football ──────────────────────────────────────────────────────────
function VFootball() {
  const { user } = useAuth();
  const countdown = useCountdown(180);
  const mm = String(Math.floor(countdown / 60)).padStart(2, "0");
  const ss = String(countdown % 60).padStart(2, "0");

  const matches = FOOTBALL_TEAMS.map(([h, a]) => ({
    home: h, away: a,
    oh: randOdds(1.6, 2.5), od: randOdds(2.8, 1.5), oa: randOdds(1.8, 3),
  }));

  return (
    <div>
      {/* Countdown */}
      <div className="mx-3 mb-3 rounded-2xl py-4 text-center" style={{ background: "linear-gradient(135deg,#0a3d1f,#0d1f3c)", border: "1px solid rgba(27,138,60,0.3)" }}>
        <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Next kick-off in</div>
        <div className="text-4xl font-black font-mono" style={{ color: GOLD }}>{mm}:{ss}</div>
        <div className="text-[11px] text-white/30 mt-1">Round #VF-{Math.floor(Math.random() * 9000 + 1000)}</div>
      </div>
      {/* Matches */}
      <div className="mx-3 space-y-2 mb-4">
        {matches.map((m, i) => (
          <div key={i} className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-xs font-bold text-white">{m.home}</div>
              <div className="text-[10px] px-2 py-0.5 rounded font-black" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>VS</div>
              <div className="text-xs font-bold text-white">{m.away}</div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[{ label: "1 Home", odds: m.oh }, { label: "X Draw", odds: m.od }, { label: "2 Away", odds: m.oa }].map(o => (
                <button key={o.label}
                  className="py-2 rounded-lg text-center transition-all active:scale-95"
                  style={{ background: "rgba(253,208,23,0.08)", border: "1px solid rgba(253,208,23,0.15)" }}>
                  <div className="text-[9px] text-white/40">{o.label}</div>
                  <div className="text-sm font-black" style={{ color: GOLD }}>{o.odds}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!user && (
        <div className="mx-3 mb-4">
          <Link href="/login" className="block w-full py-3 rounded-xl text-sm font-black text-center text-black" style={{ background: GOLD }}>
            Login to Bet
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Horse / Dog Racing ────────────────────────────────────────────────────────
function RacingGame({ sport }: { sport: "horses" | "dogs" }) {
  const names = sport === "horses" ? HORSE_NAMES : DOG_NAMES;
  const countdown = useCountdown(sport === "horses" ? 120 : 90);
  const mm = String(Math.floor(countdown / 60)).padStart(2, "0");
  const ss = String(countdown % 60).padStart(2, "0");

  const runners = names.map((name, i) => ({
    name, num: i + 1,
    win: randOdds(1.5, 14), place: randOdds(1.2, 3),
    color: ["#e63946","#2196f3","#ff9800","#9c27b0","#4caf50","#f44336","#00bcd4","#ffeb3b"][i] ?? GOLD,
  }));

  return (
    <div>
      <div className="mx-3 mb-3 rounded-2xl py-4 text-center" style={{ background: "linear-gradient(135deg,#1a0a3d,#0d1f3c)", border: "1px solid rgba(130,80,220,0.3)" }}>
        <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Race starts in</div>
        <div className="text-4xl font-black font-mono" style={{ color: GOLD }}>{mm}:{ss}</div>
        <div className="text-[11px] text-white/30 mt-1">{sport === "horses" ? "🏇" : "🐕"} {runners.length} runners · Track: Virtual TZ</div>
      </div>
      <div className="mx-3 space-y-2 mb-4">
        {runners.map(r => (
          <div key={r.num} className="rounded-xl px-3 py-2.5 flex items-center gap-3" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0" style={{ background: r.color }}>
              {r.num}
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-white">{r.name}</div>
            </div>
            <div className="flex gap-2">
              <button className="py-1.5 px-3 rounded-lg text-center" style={{ background: "rgba(253,208,23,0.08)", border: "1px solid rgba(253,208,23,0.15)" }}>
                <div className="text-[8px] text-white/40">WIN</div>
                <div className="text-xs font-black" style={{ color: GOLD }}>{r.win}</div>
              </button>
              <button className="py-1.5 px-3 rounded-lg text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-[8px] text-white/40">PLACE</div>
                <div className="text-xs font-black text-white">{r.place}</div>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Virtual Basketball ────────────────────────────────────────────────────────
function VBasketball() {
  const countdown = useCountdown(150);
  const mm = String(Math.floor(countdown / 60)).padStart(2, "0");
  const ss = String(countdown % 60).padStart(2, "0");

  return (
    <div>
      <div className="mx-3 mb-3 rounded-2xl py-4 text-center" style={{ background: "linear-gradient(135deg,#1a0a0a,#0d1f3c)", border: "1px solid rgba(220,100,39,0.3)" }}>
        <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Tip-off in</div>
        <div className="text-4xl font-black font-mono" style={{ color: GOLD }}>{mm}:{ss}</div>
      </div>
      <div className="mx-3 space-y-2 mb-4">
        {NBA_TEAMS.map(([h, a], i) => {
          const oh = randOdds(1.5, 1), oa = randOdds(1.5, 1);
          const pts = [
            { label: "O 185.5", odds: randOdds(1.7, 0.4) },
            { label: "U 185.5", odds: randOdds(1.7, 0.4) },
          ];
          return (
            <div key={i} className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-xs font-bold text-white">{h}</div>
                <div className="text-[10px] px-2 py-0.5 rounded font-black" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>VS</div>
                <div className="text-xs font-bold text-white">{a}</div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[{ label: `${h.split(" ")[0]} ML`, odds: oh }, { label: `${a.split(" ")[0]} ML`, odds: oa }, ...pts].map(o => (
                  <button key={o.label} className="py-2 rounded-lg text-center" style={{ background: "rgba(253,208,23,0.08)", border: "1px solid rgba(253,208,23,0.15)" }}>
                    <div className="text-[8px] text-white/40 truncate">{o.label}</div>
                    <div className="text-sm font-black" style={{ color: GOLD }}>{o.odds}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Virtual Cycling ───────────────────────────────────────────────────────────
function VCycling() {
  const countdown = useCountdown(60);
  const riders = Array.from({ length: 10 }, (_, i) => ({
    name: `Rider ${i + 1}`, num: i + 1,
    odds: randOdds(3, 20),
    color: ["#e63946","#2196f3","#ff9800","#9c27b0","#4caf50","#f44336","#00bcd4","#ffeb3b","#607d8b","#795548"][i] ?? GOLD,
  }));
  return (
    <div>
      <div className="mx-3 mb-3 rounded-2xl py-4 text-center" style={{ background: "linear-gradient(135deg,#0a1a2a,#0d1f3c)", border: "1px solid rgba(33,150,243,0.3)" }}>
        <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Race in</div>
        <div className="text-4xl font-black font-mono" style={{ color: GOLD }}>{String(countdown).padStart(2, "0")}s</div>
        <div className="text-[11px] text-white/30 mt-1">🚴 {riders.length} riders · 5km Sprint</div>
      </div>
      <div className="mx-3 grid grid-cols-2 gap-2 mb-4">
        {riders.map(r => (
          <button key={r.num} className="rounded-xl px-3 py-2.5 flex items-center gap-2 text-left" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0" style={{ background: r.color }}>
              {r.num}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-white/60 truncate">{r.name}</div>
              <div className="text-sm font-black" style={{ color: GOLD }}>{r.odds}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function VirtualsPage() {
  const [active, setActive] = useState<VSport>("football");
  const sport = SPORTS.find(s => s.id === active)!;

  return (
    <div className="max-w-lg mx-auto" style={{ background: "#0a1628", minHeight: "100vh" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 mb-3" style={{ background: "#060d1a", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-2xl">🎮</span>
        <div>
          <div className="text-base font-black text-white">VIRTUALS</div>
          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>AI-powered virtual sports</div>
        </div>
        <div className="ml-auto">
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(253,208,23,0.15)", color: GOLD }}>24/7 LIVE</span>
        </div>
      </div>

      {/* Sport tabs */}
      <div className="flex gap-2 px-3 mb-4 overflow-x-auto pb-1">
        {SPORTS.map(s => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: active === s.id ? GOLD : "rgba(255,255,255,0.07)",
              color: active === s.id ? "#000" : "rgba(255,255,255,0.6)",
            }}
          >
            <span>{s.icon}</span>
            <span>{s.label.split(" ")[1] ?? s.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {active === "football"   && <VFootball />}
      {active === "horses"     && <RacingGame sport="horses" />}
      {active === "dogs"       && <RacingGame sport="dogs" />}
      {active === "basketball" && <VBasketball />}
      {active === "cycling"    && <VCycling />}
    </div>
  );
}
