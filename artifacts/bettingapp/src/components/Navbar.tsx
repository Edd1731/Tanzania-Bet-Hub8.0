import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/use-translation";

export function Navbar() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useTranslation();
  const [location] = useLocation();

  const navLink = (href: string, label: string, isAdmin?: boolean) => (
    <Link
      href={href}
      className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-150 ${
        location === href
          ? isAdmin
            ? "bg-[#1565C0] text-white shadow-sm"
            : "bg-primary text-primary-foreground"
          : isAdmin
            ? "text-[#4da6ff] hover:text-white hover:bg-[#1565C0]/30 border border-[#1565C0]/30"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur" style={{ marginTop: "3px" }}>
      {/* Tanzania flag stripe across the top of the nav */}
      <div className="h-0.5 w-full flex">
        <div className="flex-1" style={{ background: "#1B8A3C" }} />
        <div className="w-6" style={{ background: "#111111" }} />
        <div className="flex-1" style={{ background: "#FDD017" }} />
        <div className="w-6" style={{ background: "#111111" }} />
        <div className="flex-1" style={{ background: "#1565C0" }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="relative w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
            <div className="absolute inset-0 flex">
              <div className="flex-1" style={{ background: "#1B8A3C" }} />
              <div className="flex-1" style={{ background: "#111111" }} />
              <div className="flex-1" style={{ background: "#1565C0" }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="absolute w-full h-[3px]"
                style={{ background: "#FDD017", transform: "rotate(-35deg) scaleX(2)" }}
              />
            </div>
            <span className="relative z-10 text-white font-black text-xs drop-shadow">BT</span>
          </div>
          <span className="font-black text-lg tracking-tight text-foreground">BetTZ</span>
        </Link>

        {/* Nav links — user links only */}
        <div className="flex items-center gap-1 flex-1 justify-center">
          {navLink("/", t("events"))}
          {user && !user.isAdmin && navLink("/my-bets", t("my_bets"))}
          {user && !user.isAdmin && navLink("/deposit", t("deposit"))}
          {user && !user.isAdmin && navLink("/profile", t("profile"))}
          {/* Admin link only for admin users */}
          {user?.isAdmin && navLink("/admin", t("admin"), true)}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "en" ? "sw" : "en")}
            className="text-xs font-bold px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
          >
            {lang === "en" ? "SW" : "EN"}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              {user.isAdmin ? (
                <span className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[#4da6ff] bg-[#1565C0]/20 border border-[#1565C0]/40 px-2.5 py-1 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4da6ff] inline-block" />
                  Admin
                </span>
              ) : (
                <span className="hidden sm:block text-xs text-muted-foreground">
                  TZS {Number(user.balance).toLocaleString()}
                </span>
              )}
              <button
                onClick={logout}
                className="text-xs px-3 py-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium"
              >
                {t("logout")}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {navLink("/login", t("login"))}
              <Link
                href="/register"
                className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold"
              >
                {t("register")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
