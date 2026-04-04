import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/use-translation";

const GOLD = "#FDD017";
const NAVY = "#0d1f3c";
const NAVY2 = "#0a1628";

// ─── Sidebar nav items ──────────────────────────────────────────
const NAV_ITEMS = [
  { id: "sports",   label: "Sports",       href: "/",         badge: null,   icon: <IcoSports /> },
  { id: "live",     label: "Live Games",   href: "/",         badge: null,   icon: <IcoLive /> },
  { id: "aviator",  label: "Aviator",      href: "/",         badge: "NEW!", icon: <IcoAviator /> },
  { id: "casino",   label: "Casino",       href: "/",         badge: null,   icon: <IcoCasino /> },
  { id: "virtuals", label: "Virtuals",     href: "/",         badge: null,   icon: <IcoVirtuals /> },
  { id: "jackpots", label: "Jackpots",     href: "/",         badge: "NEW!", icon: <IcoJackpots /> },
  { id: "lucky",    label: "Lucky Numbers",href: "/",         badge: null,   icon: <IcoLucky /> },
];

const ACCOUNT_ITEMS = [
  { id: "deposit",     label: "Deposit",             href: "/deposit",  icon: <IcoDeposit /> },
  { id: "withdraw",    label: "Withdraw",            href: "/withdraw", icon: <IcoWithdraw /> },
  { id: "bet-history", label: "Bet History",         href: "/my-bets",  icon: <IcoBetHistory /> },
  { id: "tx-history",  label: "Transaction History", href: "/deposit",  icon: <IcoTxHistory /> },
  { id: "settings",    label: "Settings",            href: "/profile",  icon: <IcoSettings /> },
  { id: "self-excl",   label: "Self Exclusion",      href: "/profile",  icon: <IcoSelfExcl /> },
];

// ─── Props ──────────────────────────────────────────────────────
interface NavbarProps {
  betSlipCount?: number;
  onOpenBetSlip?: () => void;
}

export function Navbar({ betSlipCount = 0, onOpenBetSlip }: NavbarProps) {
  const { user, logout } = useAuth();
  const { lang, setLang } = useTranslation();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => location === href;

  return (
    <>
      {/* ── Top header ── */}
      <header className="sticky top-0 z-50" style={{ background: NAVY }}>
        {/* Tanzania flag strip */}
        <div className="h-[3px] w-full flex">
          <div className="flex-1" style={{ background: "#1B8A3C" }} />
          <div className="w-4"   style={{ background: "#111" }} />
          <div className="flex-1" style={{ background: GOLD }} />
          <div className="w-4"   style={{ background: "#111" }} />
          <div className="flex-1" style={{ background: "#1565C0" }} />
        </div>

        {/* Main row */}
        <div className="flex items-center justify-between px-3 h-12">
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-8 h-8 flex flex-col items-center justify-center gap-[5px]"
              aria-label="Open menu"
            >
              <span className="block w-5 h-[2px] bg-white rounded-full" />
              <span className="block w-5 h-[2px] bg-white rounded-full" />
              <span className="block w-4 h-[2px] bg-white rounded-full self-start" />
            </button>
            <Link href="/" className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-md overflow-hidden flex items-center justify-center shrink-0" style={{ background: "#1B8A3C" }}>
                <span className="text-white font-black text-[10px] tracking-tight">BP</span>
              </div>
              <span className="font-black text-lg tracking-tight text-white">Betpesaa</span>
            </Link>
          </div>

          {/* Right: lang, search, betslip */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLang(lang === "en" ? "sw" : "en")}
              className="text-[10px] font-black px-2 py-0.5 rounded border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors mr-1"
            >
              {lang === "en" ? "SW" : "EN"}
            </button>

            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" />
              </svg>
            </button>

            <button
              onClick={onOpenBetSlip}
              className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="Betslip"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 2H9a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/>
                <path d="M9 7h6M9 11h6M9 15h4"/>
              </svg>
              {betSlipCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-black text-black px-[3px]"
                  style={{ background: GOLD }}
                >
                  {betSlipCount}
                </span>
              )}
            </button>

            {user ? (
              <button
                onClick={logout}
                className="ml-1 text-[10px] px-2 py-1 rounded text-white/60 hover:text-white border border-white/10 hover:border-white/30 transition-colors"
              >
                Out
              </button>
            ) : (
              <div className="flex items-center gap-1 ml-1">
                <Link href="/login"    className="text-[10px] px-2.5 py-1 rounded border border-white/20 text-white/80 hover:bg-white/10 transition-colors font-semibold">Login</Link>
                <Link href="/register" className="text-[10px] px-2.5 py-1 rounded font-black text-black" style={{ background: GOLD }}>Join</Link>
              </div>
            )}
          </div>
        </div>

        {/* Wallet sub-row (logged-in) */}
        {user && (
          <div className="px-3 pb-2 flex items-center justify-between" style={{ background: "#0a1830" }}>
            <div className="flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round">
                <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
              </svg>
              <span className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">Wallet</span>
              <span className="text-xs font-black text-white">TZS {Number(user.balance).toLocaleString()}</span>
            </div>
            {user.isAdmin && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-600/30">ADMIN</span>
            )}
            <Link href="/deposit" className="text-[10px] font-black px-3 py-1 rounded-full text-black" style={{ background: GOLD }}>
              + Deposit
            </Link>
          </div>
        )}
      </header>

      {/* ── Bottom nav ── */}
      <BottomNav isActive={isActive} user={user} onOpenSidebar={() => setSidebarOpen(true)} />

      {/* ── Sliding sidebar ── */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        location={location}
        user={user}
        logout={logout}
      />
    </>
  );
}

// ─── Bottom nav ─────────────────────────────────────────────────
function BottomNav({
  isActive, user, onOpenSidebar
}: {
  isActive: (h: string) => boolean;
  user: any;
  onOpenSidebar: () => void;
}) {
  const loggedIn = !!user;
  const isAdmin  = user?.isAdmin;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
      style={{ background: NAVY, borderTop: "1px solid rgba(255,255,255,0.08)", height: "56px" }}
    >
      {isAdmin ? (
        <>
          <BottomItem href="/"      icon={<IcoSports />}     label="Events" active={isActive("/")} />
          <BottomItem href="/admin" icon={<IcoLockAdmin />}  label="Admin"  active={isActive("/admin")} admin />
        </>
      ) : (
        <>
          <BottomItem href="/"         icon={<IcoSports />}   label="Events"  active={isActive("/")} />
          <BottomItem href="/my-bets"  icon={<IcoTicket />}   label="My Bets" active={isActive("/my-bets")} locked={!loggedIn} />

          {/* Gold deposit center button */}
          <div className="flex-1 flex items-center justify-center">
            <Link
              href={loggedIn ? "/deposit" : "/login"}
              className="flex flex-col items-center justify-center gap-0.5 -mt-4 w-14 h-14 rounded-full shadow-lg border-4 text-black"
              style={{ background: GOLD, borderColor: NAVY }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12l7-7 7 7"/>
              </svg>
              <span className="text-[8px] font-black leading-none">DEPOSIT</span>
            </Link>
          </div>

          <BottomItem href="/profile" icon={<IcoUser />} label="Profile" active={isActive("/profile")} locked={!loggedIn} />

          {/* More → opens sidebar */}
          <button
            onClick={onOpenSidebar}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1"
          >
            <span style={{ color: "rgba(255,255,255,0.55)" }}><IcoMore /></span>
            <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.55)" }}>More</span>
          </button>
        </>
      )}
    </nav>
  );
}

function BottomItem({ href, icon, label, active, admin, locked }: {
  href: string; icon: React.ReactNode; label: string;
  active: boolean; admin?: boolean; locked?: boolean;
}) {
  const color = active
    ? (admin ? "#4da6ff" : GOLD)
    : locked ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.55)";
  return (
    <Link href={href} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1">
      <span style={{ color }}>{icon}</span>
      <span className="text-[9px] font-bold" style={{ color }}>{label}</span>
    </Link>
  );
}

// ─── Sidebar ────────────────────────────────────────────────────
function Sidebar({
  open, onClose, location, user, logout
}: {
  open: boolean; onClose: () => void;
  location: string; user: any; logout: () => void;
}) {
  const loggedIn = !!user;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        className="fixed top-0 left-0 bottom-0 z-[70] flex flex-col overflow-hidden transition-transform duration-300 ease-out"
        style={{
          width: "min(85vw, 340px)",
          background: "#0e1e35",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          boxShadow: open ? "4px 0 32px rgba(0,0,0,0.6)" : "none",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 h-14 shrink-0"
          style={{ background: NAVY, borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md overflow-hidden flex items-center justify-center" style={{ background: "#1B8A3C" }}>
              <span className="text-white font-black text-[10px]">BP</span>
            </div>
            <span className="font-black text-lg text-white tracking-tight">Betpesaa</span>
          </div>

          <div className="w-8" /> {/* Spacer to center logo */}
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* User info strip */}
          {loggedIn && (
            <div className="px-4 py-3 flex items-center gap-3" style={{ background: "#0a1525", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-black shrink-0" style={{ background: GOLD }}>
                {user.name?.charAt(0)?.toUpperCase() ?? "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black text-white truncate">{user.name}</div>
                <div className="text-xs text-white/40">{user.phone}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Balance</div>
                <div className="text-sm font-black text-white">TZS {Number(user.balance).toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* ── Main navigation ── */}
          <div className="py-2">
            {NAV_ITEMS.map((item, i) => {
              const isActiveItem = item.href === "/" ? location === "/" : location.startsWith(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors relative"
                  style={{
                    background: i === 0 ? "rgba(0,120,255,0.18)" : "transparent",
                    borderLeft: i === 0 ? "3px solid #0078FF" : "3px solid transparent",
                  }}
                >
                  <span style={{ color: i === 0 ? "#fff" : "rgba(255,255,255,0.6)" }}>
                    {item.icon}
                  </span>
                  <span
                    className="flex-1 text-sm font-semibold"
                    style={{ color: i === 0 ? "#fff" : "rgba(255,255,255,0.8)" }}
                  >
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      className="text-[9px] font-black px-1.5 py-0.5 rounded"
                      style={{ background: GOLD, color: "#000" }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* ── Divider ── */}
          <div className="mx-4 my-1" style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

          {/* ── Account section ── */}
          <div className="py-2">
            <div className="px-5 py-2 text-[10px] font-black text-white/30 uppercase tracking-widest">Account</div>
            {ACCOUNT_ITEMS.map(item => (
              <Link
                key={item.id}
                href={loggedIn ? item.href : "/login"}
                onClick={onClose}
                className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                <span style={{ color: "rgba(255,255,255,0.5)" }}>{item.icon}</span>
                <span className="text-sm font-semibold">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* ── Login / Logout ── */}
          <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {loggedIn ? (
              <button
                onClick={() => { logout(); onClose(); }}
                className="w-full py-3 rounded-xl text-sm font-black text-white/60 transition-colors"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                Logout
              </button>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login" onClick={onClose}
                  className="flex-1 py-3 rounded-xl text-sm font-black text-center text-black"
                  style={{ background: GOLD }}
                >
                  Login
                </Link>
                <Link
                  href="/register" onClick={onClose}
                  className="flex-1 py-3 rounded-xl text-sm font-black text-center text-white"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Bottom spacing for mobile safe area */}
          <div className="h-8" />
        </div>
      </div>
    </>
  );
}

// ─── Icon components ────────────────────────────────────────────
function IcoSports() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
      <path d="M2 12h20"/>
    </svg>
  );
}
function IcoLive() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  );
}
function IcoAviator() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 21 4s-2 0-3.5 1.5L14 9l-8.2 1.8L4 12l6 2 2 6 1.2-1.8z"/>
    </svg>
  );
}
function IcoCasino() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
function IcoVirtuals() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="m8 8 4 4 4-4"/>
    </svg>
  );
}
function IcoJackpots() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="8" y2="6"/><line x1="8" y1="12" x2="8" y2="12"/>
      <line x1="8" y1="18" x2="8" y2="18"/><line x1="12" y1="6" x2="12" y2="6"/>
      <line x1="12" y1="12" x2="12" y2="12"/><line x1="12" y1="18" x2="12" y2="18"/>
      <line x1="16" y1="6" x2="16" y2="6"/><line x1="16" y1="12" x2="16" y2="12"/>
      <line x1="16" y1="18" x2="16" y2="18"/>
    </svg>
  );
}
function IcoLucky() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
    </svg>
  );
}
function IcoTicket() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <path d="M9 12h6M9 16h4"/>
    </svg>
  );
}
function IcoUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  );
}
function IcoMore() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>
    </svg>
  );
}
function IcoLockAdmin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
function IcoDeposit() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7 7 7-7"/>
    </svg>
  );
}
function IcoWithdraw() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12l7-7 7 7"/>
    </svg>
  );
}
function IcoBetHistory() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
    </svg>
  );
}
function IcoTxHistory() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4"/>
    </svg>
  );
}
function IcoSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}
function IcoSelfExcl() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  );
}
