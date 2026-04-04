import { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/use-translation";
import { Link, useLocation } from "wouter";

const GOLD = "#FDD017";
const NAVY = "#0d1f3c";

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
      const res = await login.mutateAsync({ data: { phone, password } });
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
    <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative w-20 h-14 mx-auto mb-4 rounded-xl overflow-hidden">
            <div className="absolute inset-0 flex">
              <div className="flex-1" style={{ background: "#1B8A3C" }} />
              <div className="w-3" style={{ background: "#111111" }} />
              <div className="flex-1" style={{ background: GOLD }} />
              <div className="w-3" style={{ background: "#111111" }} />
              <div className="flex-1" style={{ background: "#1565C0" }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-black text-xl drop-shadow-lg">BetTZ</span>
            </div>
          </div>
          <h1 className="text-2xl font-black text-white">
            {isAdmin ? "Admin Portal" : "Welcome Back"}
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {isAdmin ? "Restricted — Authorised Personnel Only" : "Login to your account"}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl p-1 mb-4" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={() => switchTab("user")}
            className="flex-1 py-2 text-sm font-bold rounded-lg transition-all"
            style={{
              background: !isAdmin ? GOLD : "transparent",
              color: !isAdmin ? "#000" : "rgba(255,255,255,0.45)",
            }}
          >
            Player Login
          </button>
          <button
            onClick={() => switchTab("admin")}
            className="flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
            style={{
              background: isAdmin ? "#1565C0" : "transparent",
              color: isAdmin ? "#fff" : "rgba(255,255,255,0.45)",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
            </svg>
            Admin
          </button>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: "#111827",
            border: `1px solid ${isAdmin ? "#1565C040" : "rgba(255,255,255,0.07)"}`,
          }}
        >
          {isAdmin && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(21,101,192,0.15)", border: "1px solid rgba(21,101,192,0.3)" }}>
              <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
              <span className="text-xs text-blue-400 font-medium">Secure Admin Access</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg px-3 py-2 text-sm text-red-400" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">{t("phone")}</label>
            <input
              type="tel" value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="07XXXXXXXX"
              className="w-full rounded-xl px-3 py-3 text-sm text-white outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${isAdmin ? "rgba(21,101,192,0.3)" : "rgba(255,255,255,0.1)"}`,
              }}
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">{t("password")}</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl px-3 py-3 text-sm text-white outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${isAdmin ? "rgba(21,101,192,0.3)" : "rgba(255,255,255,0.1)"}`,
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full font-black py-3.5 rounded-xl text-sm disabled:opacity-50 transition-opacity"
            style={{
              background: isAdmin ? "#1565C0" : GOLD,
              color: isAdmin ? "#fff" : "#000",
            }}
          >
            {login.isPending ? "Signing in..." : isAdmin ? "Sign In as Admin" : t("login")}
          </button>
        </form>

        {!isAdmin && (
          <p className="text-center text-sm text-white/40 mt-4">
            Don't have an account?{" "}
            <Link href="/register" className="font-black hover:underline" style={{ color: GOLD }}>
              {t("register")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
