import { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/use-translation";
import { Link, useLocation } from "wouter";

type Tab = "user" | "admin";

export default function LoginPage() {
  const { t } = useTranslation();
  const { setToken } = useAuth();
  const [, navigate] = useLocation();
  const login = useLogin();

  const [tab, setTab] = useState<Tab>("user");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await login.mutateAsync({ phone, password });
      setToken(res.token);
      navigate(res.user?.isAdmin ? "/admin" : "/");
    } catch (err: any) {
      setError(err?.data?.message || err?.message || "Login failed");
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setPhone("");
    setPassword("");
    setError("");
  };

  const isAdmin = tab === "admin";

  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative w-20 h-14 mx-auto mb-4 rounded-xl overflow-hidden">
            <div className="absolute inset-0 flex">
              <div className="flex-1" style={{ background: "#1B8A3C" }} />
              <div className="w-3" style={{ background: "#111111" }} />
              <div className="flex-1" style={{ background: "#FDD017" }} />
              <div className="w-3" style={{ background: "#111111" }} />
              <div className="flex-1" style={{ background: "#1565C0" }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-black text-xl drop-shadow-lg">BetTZ</span>
            </div>
          </div>
          <h1 className="text-2xl font-black text-foreground">
            {isAdmin ? "Admin Portal" : "BetTZ"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin ? "Restricted — Authorised Personnel Only" : t("login")}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-muted border border-border p-1 mb-4">
          <button
            onClick={() => switchTab("user")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              !isAdmin
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("login")}
          </button>
          <button
            onClick={() => switchTab("admin")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              isAdmin
                ? "bg-[#1565C0] text-white shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
            </svg>
            Admin
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className={`border rounded-2xl p-6 space-y-4 transition-colors ${
            isAdmin
              ? "bg-[#0a1628] border-[#1565C0]/50"
              : "bg-card border-border"
          }`}
        >
          {isAdmin && (
            <div className="flex items-center gap-2 bg-[#1565C0]/15 border border-[#1565C0]/30 rounded-lg px-3 py-2">
              <div className="w-2 h-2 rounded-full bg-[#4da6ff] shrink-0" />
              <span className="text-xs text-[#4da6ff] font-medium">Secure Admin Access</span>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              {t("phone")}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="07XXXXXXXX"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-colors ${
                isAdmin
                  ? "bg-[#060d1a] border-[#1565C0]/40 focus:ring-[#1565C0]"
                  : "bg-background border-input focus:ring-ring"
              }`}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              {t("password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-colors ${
                isAdmin
                  ? "bg-[#060d1a] border-[#1565C0]/40 focus:ring-[#1565C0]"
                  : "bg-background border-input focus:ring-ring"
              }`}
              required
            />
          </div>

          <button
            type="submit"
            disabled={login.isPending}
            className={`w-full font-black py-3 rounded-lg text-sm transition-colors disabled:opacity-50 ${
              isAdmin
                ? "bg-[#1565C0] text-white hover:bg-[#1565C0]/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {login.isPending ? "..." : isAdmin ? "Sign In as Admin" : t("login")}
          </button>
        </form>

        {!isAdmin && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            {t("register")}?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              {t("register")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
