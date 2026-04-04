import { useState } from "react";
import {
  useGetStatsSummary, useGetMe, useGetMyBets,
  getGetStatsSummaryQueryKey, getGetMeQueryKey, getGetMyBetsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/use-translation";
import { Link } from "wouter";

const GOLD = "#FDD017";
const NAVY = "#0d1f3c";
const GREEN = "#1B8A3C";

// ─── Accordion section ───────────────────────────────────────────
function Section({
  icon, title, subtitle, defaultOpen = false, children, accent,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  accent?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-2xl overflow-hidden mb-3"
      style={{
        background: "#111827",
        border: `1px solid ${open && accent ? accent + "30" : "rgba(255,255,255,0.07)"}`,
        transition: "border-color 0.2s",
      }}
    >
      {/* Header row — clickable */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left"
        style={{ background: open ? "rgba(255,255,255,0.03)" : "transparent" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: accent ? accent + "20" : "rgba(255,255,255,0.06)" }}
        >
          <span style={{ color: accent ?? "rgba(255,255,255,0.5)" }}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black text-white">{title}</div>
          {subtitle && <div className="text-[11px] text-white/40 mt-0.5 truncate">{subtitle}</div>}
        </div>
        <svg
          className="shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Body */}
      {open && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Stat row inside accordion ────────────────────────────────────
function StatRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span className="text-sm text-white/50">{label}</span>
      <span className="text-sm font-black" style={{ color: highlight ? GOLD : "#fff" }}>{value}</span>
    </div>
  );
}

// ─── Bet status badge ─────────────────────────────────────────────
function BetBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    pending:  ["rgba(253,208,23,0.12)",  GOLD],
    won:      ["rgba(27,138,60,0.15)",   "#4ade80"],
    lost:     ["rgba(239,68,68,0.12)",   "#f87171"],
    settled:  ["rgba(99,102,241,0.12)",  "#a5b4fc"],
  };
  const [bg, color] = map[status] ?? ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.4)"];
  return (
    <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase" style={{ background: bg, color }}>
      {status}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const { data: me }    = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: stats, isLoading: statsLoading } = useGetStatsSummary({ query: { queryKey: getGetStatsSummaryQueryKey() } });
  const { data: bets,  isLoading: betsLoading }  = useGetMyBets({ query: { queryKey: getGetMyBetsQueryKey() } });

  const winRate = stats && stats.totalBets > 0
    ? Math.round((stats.wonBets / stats.totalBets) * 100) : 0;

  const recentBets = [...(bets ?? [])].reverse().slice(0, 5);

  const displayName = me?.name ?? user?.name ?? "User";
  const displayPhone = me?.phone ?? user?.phone ?? "";
  const displayBalance = Number(me?.balance ?? user?.balance ?? 0);

  return (
    <div className="max-w-lg mx-auto px-3 pt-4 pb-8" style={{ background: "#0a1628", minHeight: "100vh" }}>

      {/* ── Hero user card ── */}
      <div
        className="rounded-2xl px-5 py-5 mb-4 relative overflow-hidden"
        style={{ background: NAVY, border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Decorative gradient */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: `radial-gradient(circle at 80% 50%, ${GREEN}60, transparent 60%)` }}
        />

        <div className="relative flex items-center gap-4">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 font-black text-2xl text-black"
            style={{ background: GOLD }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>

          {/* Name + phone */}
          <div className="flex-1 min-w-0">
            <div className="text-lg font-black text-white leading-tight truncate">{displayName}</div>
            <div className="text-sm text-white/50 mt-0.5">{displayPhone}</div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[10px] text-green-400 font-semibold">Active Account</span>
            </div>
          </div>

          {/* Balance */}
          <div className="text-right shrink-0">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Balance</div>
            <div className="text-xl font-black leading-tight" style={{ color: GOLD }}>
              TZS {displayBalance.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="grid grid-cols-2 gap-2 mt-4 relative">
          <Link
            href="/deposit"
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-black"
            style={{ background: GOLD }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round"><path d="M12 19V5M5 12l7 7 7-7" /></svg>
            Deposit
          </Link>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black"
            style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            Logout
          </button>
        </div>
      </div>

      {/* ── Betting Stats section ── */}
      <Section
        icon={<IcoStats />}
        title="Betting Stats"
        subtitle={stats ? `${stats.totalBets} total bets · ${winRate}% win rate` : "Loading..."}
        accent={GOLD}
        defaultOpen={true}
      >
        {statsLoading ? (
          <div className="p-4 space-y-2">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />)}
          </div>
        ) : (
          <>
            <StatRow label="Total Bets"    value={stats?.totalBets ?? 0} />
            <StatRow label="Won Bets"      value={stats?.wonBets ?? 0}   highlight />
            <StatRow label="Lost Bets"     value={stats?.lostBets ?? 0} />
            <StatRow label="Pending Bets"  value={stats?.pendingBets ?? 0} />
            <StatRow label="Total Wagered" value={`TZS ${Number(stats?.totalWagered ?? 0).toLocaleString()}`} />
            <StatRow label="Total Won"     value={`TZS ${Number(stats?.totalWon ?? 0).toLocaleString()}`} highlight />

            {/* Win rate bar */}
            <div className="px-4 py-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] text-white/40 font-semibold uppercase tracking-widest">Win Rate</span>
                <span className="text-xs font-black" style={{ color: GOLD }}>{winRate}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${winRate}%`, background: `linear-gradient(90deg, ${GREEN}, ${GOLD})` }}
                />
              </div>
            </div>
          </>
        )}
      </Section>

      {/* ── Recent Bets section ── */}
      <Section
        icon={<IcoTicket />}
        title="Recent Bets"
        subtitle={bets ? `${bets.length} bet${bets.length !== 1 ? "s" : ""} placed` : "Loading..."}
        accent={GREEN}
      >
        {betsLoading ? (
          <div className="p-4 space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />)}
          </div>
        ) : recentBets.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="text-2xl mb-2">🎯</div>
            <div className="text-sm text-white/30">No bets placed yet</div>
          </div>
        ) : (
          <>
            {recentBets.map(bet => (
              <div
                key={bet.id}
                className="px-4 py-3 flex items-center justify-between gap-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {bet.event
                      ? `${bet.event.teamHome} vs ${bet.event.teamAway}`
                      : `Bet #${bet.id}`}
                  </div>
                  <div className="text-[10px] text-white/40 mt-0.5 capitalize">{bet.choice?.replace(/_/g, " ")}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-black text-white">TZS {Number(bet.amount).toLocaleString()}</div>
                  <div className="mt-0.5"><BetBadge status={bet.status} /></div>
                </div>
              </div>
            ))}
            <div className="px-4 py-3">
              <Link
                href="/my-bets"
                className="block w-full text-center text-xs font-black py-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                View All Bets →
              </Link>
            </div>
          </>
        )}
      </Section>

      {/* ── Deposit section ── */}
      <Section
        icon={<IcoDeposit />}
        title="Fund Account"
        subtitle="M-Pesa, TigoPesa, HaloPesa, Airtel"
        accent="#00A651"
      >
        <div className="px-4 py-4 space-y-3">
          {[
            { key: "mpesa",    label: "M-Pesa",      number: "0744 123 456", color: "#00A651", logo: "📱" },
            { key: "tigopesa", label: "Tigo Pesa",   number: "0712 123 456", color: "#009BDE", logo: "📲" },
            { key: "halopesa", label: "HaloPesa",    number: "0621 123 456", color: "#F7941D", logo: "💳" },
            { key: "airtel",   label: "Airtel Money", number: "0684 123 456", color: "#ED1C24", logo: "📡" },
          ].map(m => (
            <div
              key={m.key}
              className="flex items-center gap-3 px-3 py-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span className="text-xl shrink-0">{m.logo}</span>
              <div className="flex-1">
                <div className="text-sm font-black" style={{ color: m.color }}>{m.label}</div>
                <div className="text-[10px] text-white/30 mt-0.5">Send to: {m.number}</div>
              </div>
              <Link
                href="/deposit"
                className="text-[10px] font-black px-3 py-1.5 rounded-lg text-black"
                style={{ background: GOLD }}
              >
                Deposit
              </Link>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Account settings section ── */}
      <Section
        icon={<IcoSettings />}
        title="Account Settings"
        subtitle="Language, security & more"
        accent="#1565C0"
      >
        <div>
          {/* Language */}
          <SettingsRow
            icon={<IcoGlobe />}
            label="Language"
            value="English / Swahili"
            href="/profile"
          />
          {/* Change Password */}
          <SettingsRow
            icon={<IcoLock />}
            label="Change Password"
            value="Update your password"
            href="/profile"
          />
          {/* Self Exclusion */}
          <SettingsRow
            icon={<IcoShield />}
            label="Responsible Gaming"
            value="Self-exclusion tools"
            href="/profile"
          />
          {/* Logout */}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-red-500/5"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.12)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-red-400">{t("logout")}</div>
              <div className="text-[10px] text-white/30 mt-0.5">Sign out of your account</div>
            </div>
          </button>
        </div>
      </Section>
    </div>
  );
}

// ─── Settings row ─────────────────────────────────────────────────
function SettingsRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white/40" style={{ background: "rgba(255,255,255,0.06)" }}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-[10px] text-white/30 mt-0.5">{value}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </Link>
  );
}

// ─── Icons ────────────────────────────────────────────────────────
function IcoStats() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
}
function IcoTicket() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" /></svg>;
}
function IcoDeposit() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7 7 7-7" /></svg>;
}
function IcoSettings() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
}
function IcoGlobe() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>;
}
function IcoLock() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
}
function IcoShield() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}
