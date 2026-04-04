import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/use-translation";

export function Navbar() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useTranslation();
  const [location] = useLocation();

  const isActive = (href: string) => location === href;

  return (
    <>
      {/* ── Top bar ── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/98 backdrop-blur" style={{ marginTop: "3px" }}>
        {/* Tanzania flag stripe */}
        <div className="h-0.5 w-full flex">
          <div className="flex-1" style={{ background: "#1B8A3C" }} />
          <div className="w-5" style={{ background: "#111111" }} />
          <div className="flex-1" style={{ background: "#FDD017" }} />
          <div className="w-5" style={{ background: "#111111" }} />
          <div className="flex-1" style={{ background: "#1565C0" }} />
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-13 flex items-center justify-between gap-2">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
              <div className="absolute inset-0 flex">
                <div className="flex-1" style={{ background: "#1B8A3C" }} />
                <div className="flex-1" style={{ background: "#111111" }} />
                <div className="flex-1" style={{ background: "#1565C0" }} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute w-full h-[3px]" style={{ background: "#FDD017", transform: "rotate(-35deg) scaleX(2)" }} />
              </div>
              <span className="relative z-10 text-white font-black text-[10px] drop-shadow">BT</span>
            </div>
            <span className="font-black text-base tracking-tight text-foreground">BetTZ</span>
          </Link>

          {/* Desktop nav (hidden on mobile — handled by bottom bar) */}
          <div className="hidden sm:flex items-center gap-1 flex-1 justify-center">
            <NavLink href="/" label={t("events")} active={isActive("/")} />
            {user && !user.isAdmin && <NavLink href="/my-bets" label={t("my_bets")} active={isActive("/my-bets")} />}
            {user && !user.isAdmin && <NavLink href="/deposit" label={t("deposit")} active={isActive("/deposit")} />}
            {user && !user.isAdmin && <NavLink href="/profile" label={t("profile")} active={isActive("/profile")} />}
            {user?.isAdmin && <NavLink href="/admin" label={t("admin")} active={isActive("/admin")} admin />}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setLang(lang === "en" ? "sw" : "en")}
              className="text-xs font-bold px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
            >
              {lang === "en" ? "SW" : "EN"}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                {user.isAdmin ? (
                  <span className="hidden sm:flex items-center gap-1 text-xs font-bold text-[#4da6ff] bg-[#1565C0]/20 border border-[#1565C0]/40 px-2 py-0.5 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4da6ff] inline-block" />Admin
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                    TZS {Number(user.balance).toLocaleString()}
                  </span>
                )}
                <button
                  onClick={logout}
                  className="text-xs px-2.5 py-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium"
                >
                  {t("logout")}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link href="/login" className="text-xs px-2.5 py-1.5 rounded border border-border text-foreground hover:bg-accent transition-colors font-medium">
                  {t("login")}
                </Link>
                <Link href="/register" className="text-xs px-2.5 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-bold">
                  {t("register")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile bottom navigation bar ── */}
      {user && (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex">
          <BottomNavLink href="/" icon={<IconEvents />} label={t("events")} active={isActive("/")} />
          {!user.isAdmin && <BottomNavLink href="/my-bets" icon={<IconBets />} label={t("my_bets")} active={isActive("/my-bets")} />}
          {!user.isAdmin && <BottomNavLink href="/deposit" icon={<IconDeposit />} label={t("deposit")} active={isActive("/deposit")} />}
          {!user.isAdmin && <BottomNavLink href="/profile" icon={<IconProfile />} label={t("profile")} active={isActive("/profile")} />}
          {user.isAdmin && <BottomNavLink href="/admin" icon={<IconAdmin />} label="Admin" active={isActive("/admin")} admin />}
        </nav>
      )}
    </>
  );
}

function NavLink({ href, label, active, admin }: { href: string; label: string; active: boolean; admin?: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
        active
          ? admin ? "bg-[#1565C0] text-white" : "bg-primary text-primary-foreground"
          : admin ? "text-[#4da6ff] hover:bg-[#1565C0]/20 border border-[#1565C0]/30" : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      {label}
    </Link>
  );
}

function BottomNavLink({ href, icon, label, active, admin }: { href: string; icon: React.ReactNode; label: string; active: boolean; admin?: boolean }) {
  return (
    <Link href={href} className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5">
      <span className={`${active ? (admin ? "text-[#4da6ff]" : "text-primary") : "text-muted-foreground"} transition-colors`}>
        {icon}
      </span>
      <span className={`text-[10px] font-semibold ${active ? (admin ? "text-[#4da6ff]" : "text-primary") : "text-muted-foreground"}`}>
        {label}
      </span>
    </Link>
  );
}

function IconEvents() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
    </svg>
  );
}
function IconBets() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" />
    </svg>
  );
}
function IconDeposit() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
    </svg>
  );
}
function IconProfile() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
function IconAdmin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
