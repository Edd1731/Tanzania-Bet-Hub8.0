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

// ─── Bottom-sheet modal wrapper ───────────────────────────────────
function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative rounded-t-3xl px-5 pt-5 pb-8 max-h-[85vh] overflow-y-auto"
        style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderBottom: "none" }}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-black text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/40"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Language modal ───────────────────────────────────────────────
function LanguageModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, setLang } = useTranslation();
  const options = [
    {
      code: "en" as const,
      label: "English",
      native: "English",
      flag: "🇬🇧",
      desc: "All labels, buttons, and messages in English",
    },
    {
      code: "sw" as const,
      label: "Swahili",
      native: "Kiswahili",
      flag: "🇹🇿",
      desc: "Vichwa, vitufe, na ujumbe kwa Kiswahili",
    },
  ];
  return (
    <Modal open={open} onClose={onClose} title="Choose Language / Chagua Lugha">
      <div className="space-y-3">
        {options.map(opt => {
          const active = lang === opt.code;
          return (
            <button
              key={opt.code}
              onClick={() => { setLang(opt.code); onClose(); }}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all"
              style={{
                background: active ? `${GOLD}15` : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${active ? GOLD : "rgba(255,255,255,0.07)"}`,
              }}
            >
              <span className="text-3xl shrink-0">{opt.flag}</span>
              <div className="flex-1">
                <div className="font-black text-white text-sm">{opt.label}
                  <span className="text-white/40 font-normal ml-1.5">— {opt.native}</span>
                </div>
                <div className="text-[11px] text-white/35 mt-0.5">{opt.desc}</div>
              </div>
              {active && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: GOLD }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-center text-[10px] text-white/25 mt-5">
        Language preference is saved on this device only.
      </p>
    </Modal>
  );
}

// ─── Change Password modal ─────────────────────────────────────────
function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext]       = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState<{ ok: boolean; text: string } | null>(null);
  const [showCurrent, setShowCurrent]   = useState(false);
  const [showNext, setShowNext]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  const reset = () => { setCurrent(""); setNext(""); setConfirm(""); setMsg(null); };

  const handleClose = () => { reset(); onClose(); };

  const submit = async () => {
    setMsg(null);
    if (!current) { setMsg({ ok: false, text: "Enter your current password." }); return; }
    if (next.length < 6) { setMsg({ ok: false, text: "New password must be at least 6 characters." }); return; }
    if (next !== confirm) { setMsg({ ok: false, text: "New passwords do not match." }); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem("bettz_token");
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ ok: false, text: data.message ?? "Something went wrong." }); }
      else { setMsg({ ok: true, text: "Password changed successfully!" }); reset(); }
    } catch {
      setMsg({ ok: false, text: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Change Password">
      <div className="space-y-3">
        {/* Current password */}
        <div>
          <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
            Current Password
          </label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              value={current}
              onChange={e => setCurrent(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-white placeholder-white/25 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30"
            >
              {showCurrent
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              }
            </button>
          </div>
        </div>

        {/* New password */}
        <div>
          <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
            New Password
          </label>
          <div className="relative">
            <input
              type={showNext ? "text" : "password"}
              value={next}
              onChange={e => setNext(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-white placeholder-white/25 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <button
              type="button"
              onClick={() => setShowNext(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30"
            >
              {showNext
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              }
            </button>
          </div>
          {/* Strength bar */}
          {next.length > 0 && (
            <div className="mt-2 flex gap-1">
              {[1,2,3,4].map(n => {
                const strength = next.length >= 10 && /[A-Z]/.test(next) && /[0-9]/.test(next) ? 4
                  : next.length >= 8 ? 3 : next.length >= 6 ? 2 : 1;
                return (
                  <div
                    key={n}
                    className="h-1 flex-1 rounded-full transition-all"
                    style={{
                      background: n <= strength
                        ? strength === 1 ? "#ef4444" : strength === 2 ? "#f97316" : strength === 3 ? GOLD : GREEN
                        : "rgba(255,255,255,0.08)",
                    }}
                  />
                );
              })}
              <span className="text-[9px] text-white/30 ml-1 self-center">
                {next.length < 6 ? "Weak" : next.length < 8 ? "Fair" : next.length < 10 ? "Good" : "Strong"}
              </span>
            </div>
          )}
        </div>

        {/* Confirm */}
        <div>
          <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-white placeholder-white/25 outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${confirm && next !== confirm ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30"
            >
              {showConfirm
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              }
            </button>
          </div>
          {confirm && next !== confirm && (
            <p className="text-[10px] text-red-400 mt-1">Passwords do not match</p>
          )}
        </div>

        {/* Feedback message */}
        {msg && (
          <div
            className="px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2"
            style={{
              background: msg.ok ? "rgba(27,138,60,0.15)" : "rgba(239,68,68,0.12)",
              border: `1px solid ${msg.ok ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`,
              color: msg.ok ? "#4ade80" : "#f87171",
            }}
          >
            {msg.ok
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            }
            {msg.text}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-black text-sm text-black mt-1 transition-opacity"
          style={{ background: GOLD, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Responsible Gaming modal ──────────────────────────────────────
function ResponsibleGamingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selectedBreak, setSelectedBreak] = useState<string | null>(null);
  const [breakConfirmed, setBreakConfirmed] = useState(false);

  const breakOptions = [
    { key: "1d",  label: "1 Day",    desc: "Account locked for 24 hours" },
    { key: "7d",  label: "7 Days",   desc: "Account locked for one week" },
    { key: "30d", label: "30 Days",  desc: "Account locked for one month" },
    { key: "perm", label: "Permanent", desc: "Permanently close my account" },
  ];

  const tips = [
    { icon: "⏱️", tip: "Set a time limit before you start playing." },
    { icon: "💰", tip: "Only bet money you can afford to lose." },
    { icon: "📵", tip: "Take regular breaks — step away often." },
    { icon: "🚫", tip: "Don't chase losses. Accept them and stop." },
    { icon: "👪", tip: "Gambling should never affect family or work." },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Responsible Gaming">
      {/* Info banner */}
      <div
        className="px-4 py-3 rounded-xl mb-4 flex gap-3"
        style={{ background: "rgba(21,101,192,0.15)", border: "1px solid rgba(21,101,192,0.3)" }}
      >
        <span className="text-xl shrink-0">🛡️</span>
        <p className="text-[11px] text-white/60 leading-relaxed">
          Betpesaa is committed to safe gambling. Gambling should be fun — never a way to make money or solve financial problems.
        </p>
      </div>

      {/* Tips */}
      <div className="mb-5">
        <div className="text-[11px] font-black text-white/40 uppercase tracking-widest mb-3">Safe Gambling Tips</div>
        <div className="space-y-2">
          {tips.map((t, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)" }}>
              <span className="text-base shrink-0">{t.icon}</span>
              <span className="text-xs text-white/55">{t.tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Self exclusion */}
      <div>
        <div className="text-[11px] font-black text-white/40 uppercase tracking-widest mb-3">Take a Break</div>
        <p className="text-xs text-white/40 mb-3 leading-relaxed">
          If you feel gambling is becoming a problem, temporarily lock your account. You cannot place bets during this period.
        </p>

        {!breakConfirmed ? (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {breakOptions.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSelectedBreak(opt.key === selectedBreak ? null : opt.key)}
                  className="px-3 py-3 rounded-xl text-left transition-all"
                  style={{
                    background: selectedBreak === opt.key ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${selectedBreak === opt.key ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.07)"}`,
                  }}
                >
                  <div className="text-xs font-black" style={{ color: selectedBreak === opt.key ? "#f87171" : "white" }}>
                    {opt.label}
                  </div>
                  <div className="text-[9px] text-white/30 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
            {selectedBreak && (
              <button
                onClick={() => setBreakConfirmed(true)}
                className="w-full py-3 rounded-xl font-black text-sm transition-all"
                style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}
              >
                Request {breakOptions.find(o => o.key === selectedBreak)?.label} Break
              </button>
            )}
          </>
        ) : (
          <div
            className="px-4 py-4 rounded-xl text-center"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <div className="text-2xl mb-2">📩</div>
            <div className="text-sm font-black text-red-400 mb-1">Request Submitted</div>
            <p className="text-[11px] text-white/40 leading-relaxed">
              Your self-exclusion request has been received. Our team will process it within 24 hours. For urgent help contact support.
            </p>
            <div className="mt-3 text-[11px] font-semibold" style={{ color: GOLD }}>
              Support: betpesaa@gmail.com
            </div>
          </div>
        )}
      </div>

      {/* Helpline */}
      <div
        className="mt-4 px-4 py-3 rounded-xl flex items-center gap-3"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span className="text-lg shrink-0">📞</span>
        <div>
          <div className="text-[11px] font-black text-white/50">National Problem Gambling Helpline (TZ)</div>
          <div className="text-xs font-black text-white mt-0.5">0800 110 001 <span className="text-white/30 font-normal">(Free & Confidential)</span></div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Accordion section ────────────────────────────────────────────
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
      {open && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span className="text-sm text-white/50">{label}</span>
      <span className="text-sm font-black" style={{ color: highlight ? GOLD : "#fff" }}>{value}</span>
    </div>
  );
}

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

// ─── Settings row (now with onClick) ─────────────────────────────
function SettingsRow({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white/40"
        style={{ background: "rgba(255,255,255,0.06)" }}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-[10px] text-white/30 mt-0.5">{value}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const [langOpen,   setLangOpen]   = useState(false);
  const [pwOpen,     setPwOpen]     = useState(false);
  const [rgOpen,     setRgOpen]     = useState(false);

  const { data: me }    = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: stats, isLoading: statsLoading } = useGetStatsSummary({ query: { queryKey: getGetStatsSummaryQueryKey() } });
  const { data: bets,  isLoading: betsLoading }  = useGetMyBets({ query: { queryKey: getGetMyBetsQueryKey() } });

  const winRate = stats && stats.totalBets > 0
    ? Math.round((stats.wonBets / stats.totalBets) * 100) : 0;

  const recentBets = [...(bets ?? [])].reverse().slice(0, 5);

  const displayName    = me?.name    ?? user?.name    ?? "User";
  const displayPhone   = me?.phone   ?? user?.phone   ?? "";
  const displayBalance = Number(me?.balance ?? user?.balance ?? 0);

  return (
    <div className="max-w-lg mx-auto px-3 pt-4 pb-8" style={{ background: "#0a1628", minHeight: "100vh" }}>

      {/* ── Hero user card ── */}
      <div
        className="rounded-2xl px-5 py-5 mb-4 relative overflow-hidden"
        style={{ background: NAVY, border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: `radial-gradient(circle at 80% 50%, ${GREEN}60, transparent 60%)` }}
        />
        <div className="relative flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 font-black text-2xl text-black"
            style={{ background: GOLD }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-black text-white leading-tight truncate">{displayName}</div>
            <div className="text-sm text-white/50 mt-0.5">{displayPhone}</div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[10px] text-green-400 font-semibold">Active Account</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Balance</div>
            <div className="text-xl font-black leading-tight" style={{ color: GOLD }}>
              TZS {displayBalance.toLocaleString()}
            </div>
          </div>
        </div>
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

      {/* ── Betting Stats ── */}
      <Section icon={<IcoStats />} title="Betting Stats"
        subtitle={stats ? `${stats.totalBets} total bets · ${winRate}% win rate` : "Loading..."}
        accent={GOLD} defaultOpen={true}
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

      {/* ── Recent Bets ── */}
      <Section icon={<IcoTicket />} title="Recent Bets"
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
              <div key={bet.id} className="px-4 py-3 flex items-center justify-between gap-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {bet.event ? `${bet.event.teamHome} vs ${bet.event.teamAway}` : `Bet #${bet.id}`}
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
              <Link href="/my-bets"
                className="block w-full text-center text-xs font-black py-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                View All Bets →
              </Link>
            </div>
          </>
        )}
      </Section>

      {/* ── Fund Account ── */}
      <Section icon={<IcoDeposit />} title="Fund Account" subtitle="Deposit & Withdraw — M-Pesa, TigoPesa, HaloPesa, Airtel" accent="#00A651">
        {/* Quick action row */}
        <div className="px-4 pt-4 pb-2 grid grid-cols-2 gap-2">
          <Link href="/deposit"
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-black"
            style={{ background: GOLD }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round"><path d="M12 19V5M5 12l7 7 7-7" /></svg>
            Deposit
          </Link>
          <Link href="/withdraw"
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black"
            style={{ background: "rgba(27,138,60,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12l7-7 7 7" /></svg>
            Withdraw
          </Link>
        </div>
        <div className="px-4 pb-4 space-y-2">
          {[
            { key: "mpesa",    label: "M-Pesa",       number: "0744 123 456", color: "#00A651", logo: "📱" },
            { key: "tigopesa", label: "Tigo Pesa",    number: "0712 123 456", color: "#009BDE", logo: "📲" },
            { key: "halopesa", label: "HaloPesa",     number: "0621 123 456", color: "#F7941D", logo: "💳" },
            { key: "airtel",   label: "Airtel Money", number: "0684 123 456", color: "#ED1C24", logo: "📡" },
          ].map(m => (
            <div key={m.key}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <span className="text-lg shrink-0">{m.logo}</span>
              <div className="flex-1">
                <div className="text-xs font-black" style={{ color: m.color }}>{m.label}</div>
                <div className="text-[10px] text-white/25 mt-0.5">Payin: {m.number}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Account Settings ── */}
      <Section icon={<IcoSettings />} title="Account Settings" subtitle="Language, security & more" accent="#1565C0">
        <div>
          <SettingsRow
            icon={<IcoGlobe />}
            label="Language"
            value="English / Swahili — tap to switch"
            onClick={() => setLangOpen(true)}
          />
          <SettingsRow
            icon={<IcoLock />}
            label="Change Password"
            value="Update your account password"
            onClick={() => setPwOpen(true)}
          />
          <SettingsRow
            icon={<IcoShield />}
            label="Responsible Gaming"
            value="Safe gambling tips & self-exclusion"
            onClick={() => setRgOpen(true)}
          />
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

      {/* ── Modals ── */}
      <LanguageModal        open={langOpen} onClose={() => setLangOpen(false)} />
      <ChangePasswordModal  open={pwOpen}   onClose={() => setPwOpen(false)} />
      <ResponsibleGamingModal open={rgOpen} onClose={() => setRgOpen(false)} />
    </div>
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
