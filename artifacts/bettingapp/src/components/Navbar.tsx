import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/use-translation";

export function Navbar() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useTranslation();
  const [location] = useLocation();

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
        location === href
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-black text-sm">BT</span>
          </div>
          <span className="font-black text-lg tracking-tight text-foreground">BetTZ</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1 flex-1 justify-center">
          {navLink("/", t("events"))}
          {user && navLink("/my-bets", t("my_bets"))}
          {user && navLink("/deposit", t("deposit"))}
          {user && navLink("/profile", t("profile"))}
          {user?.isAdmin && navLink("/admin", t("admin"))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "en" ? "sw" : "en")}
            className="text-xs font-bold px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
          >
            {lang === "en" ? "SW" : "EN"}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-xs text-muted-foreground">
                TZS {Number(user.balance).toLocaleString()}
              </span>
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
