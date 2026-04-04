import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/use-translation";

const GOLD = "#FDD017";
const NAVY = "#0d1f3c";

interface NavbarProps {
  betSlipCount?: number;
  onOpenBetSlip?: () => void;
}

export function Navbar({ betSlipCount = 0, onOpenBetSlip }: NavbarProps) {
  const { user, logout } = useAuth();
  const { lang, setLang } = useTranslation();
  const [location] = useLocation();

  const isActive = (href: string) => location === href;

  return (
    <>
      {/* ── Top header ── */}
      <header className="sticky top-0 z-50" style={{ background: NAVY }}>
        {/* Tanzania flag accent strip */}
        <div className="h-[3px] w-full flex">
          <div className="flex-1" style={{ background: "#1B8A3C" }} />
          <div className="w-4" style={{ background: "#111" }} />
          <div className="flex-1" style={{ background: GOLD }} />
          <div className="w-4" style={{ background: "#111" }} />
          <div className="flex-1" style={{ background: "#1565C0" }} />
        </div>

        {/* Main header row */}
        <div className="flex items-center justify-between px-3 h-12">
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 flex flex-col items-center justify-center gap-[5px]">
              <span className="block w-5 h-[2px] bg-white rounded-full" />
              <span className="block w-5 h-[2px] bg-white rounded-full" />
              <span className="block w-4 h-[2px] bg-white rounded-full self-start" />
            </button>
            <Link href="/" className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-md overflow-hidden flex items-center justify-center shrink-0" style={{ background: "#1B8A3C" }}>
                <span className="text-white font-black text-[11px] tracking-tight">BT</span>
              </div>
              <span className="font-black text-lg tracking-tight text-white">BetTZ</span>
            </Link>
          </div>

          {/* Right: lang toggle, search, betslip */}
          <div className="flex items-center gap-1">
            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === "en" ? "sw" : "en")}
              className="text-[10px] font-black px-2 py-0.5 rounded border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors mr-1"
            >
              {lang === "en" ? "SW" : "EN"}
            </button>

            {/* Search icon */}
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" />
              </svg>
            </button>

            {/* Betslip icon */}
            <button
              onClick={onOpenBetSlip}
              className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
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

            {/* Auth: logout or login/register */}
            {user ? (
              <button
                onClick={logout}
                className="ml-1 text-[10px] px-2 py-1 rounded text-white/60 hover:text-white border border-white/10 hover:border-white/30 transition-colors"
              >
                Out
              </button>
            ) : (
              <div className="flex items-center gap-1 ml-1">
                <Link href="/login" className="text-[10px] px-2.5 py-1 rounded border border-white/20 text-white/80 hover:bg-white/10 transition-colors font-semibold">Login</Link>
                <Link href="/register" className="text-[10px] px-2.5 py-1 rounded font-black text-black" style={{ background: GOLD }}>Join</Link>
              </div>
            )}
          </div>
        </div>

        {/* Wallet balance sub-row */}
        {user && (
          <div className="px-3 pb-2 flex items-center justify-between" style={{ background: "#0a1830" }}>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round">
                  <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
                </svg>
                <span className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">Wallet</span>
              </div>
              <span className="text-xs font-black text-white">TZS {Number(user.balance).toLocaleString()}</span>
            </div>
            {user.isAdmin && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-600/30">
                ADMIN
              </span>
            )}
            <Link href="/deposit" className="text-[10px] font-black px-3 py-1 rounded-full text-black" style={{ background: GOLD }}>
              + Deposit
            </Link>
          </div>
        )}
      </header>

      {/* ── Bottom nav ── */}
      <BottomNav isActive={isActive} user={user} />
    </>
  );
}

function BottomNav({ isActive, user }: { isActive: (h: string) => boolean; user: any }) {
  const loggedIn = !!user;
  const isAdmin = user?.isAdmin;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
      style={{ background: NAVY, borderTop: "1px solid rgba(255,255,255,0.08)", height: "56px" }}
    >
      {isAdmin ? (
        <>
          <BottomItem href="/" icon={<IcoSports />} label="Events" active={isActive("/")} />
          <BottomItem href="/admin" icon={<IcoLock />} label="Admin" active={isActive("/admin")} admin />
        </>
      ) : (
        <>
          <BottomItem href="/" icon={<IcoSports />} label="Events" active={isActive("/")} />
          <BottomItem href="/my-bets" icon={<IcoTicket />} label="My Bets" active={isActive("/my-bets")} locked={!loggedIn} />
          {/* Center Deposit highlight */}
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
          <BottomItem href={loggedIn ? "/logout-dummy" : "/login"} icon={<IcoMore />} label="More" active={false} />
        </>
      )}
    </nav>
  );
}

function BottomItem({
  href, icon, label, active, admin, locked
}: {
  href: string; icon: React.ReactNode; label: string; active: boolean; admin?: boolean; locked?: boolean;
}) {
  const color = active
    ? (admin ? "#4da6ff" : GOLD)
    : locked
      ? "rgba(255,255,255,0.25)"
      : "rgba(255,255,255,0.55)";

  return (
    <Link href={href} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1">
      <span style={{ color }}>{icon}</span>
      <span className="text-[9px] font-bold" style={{ color }}>{label}</span>
    </Link>
  );
}

function IcoSports() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
      <path d="M2 12h20"/>
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
function IcoLock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
