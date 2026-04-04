import { useState } from "react";
import { useSignup } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/use-translation";
import { Link, useLocation } from "wouter";

export default function RegisterPage() {
  const { t } = useTranslation();
  const { setToken } = useAuth();
  const [, navigate] = useLocation();
  const signup = useSignup();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await signup.mutateAsync({ name, phone, password });
      setToken(res.token);
      navigate("/");
    } catch (err: any) {
      setError(err?.data?.message || err?.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
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
          <h1 className="text-2xl font-black text-foreground">BetTZ</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("register")}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              {t("name")}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jina lako kamili"
              className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              {t("phone")}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="07XXXXXXXX"
              className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
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
              className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={signup.isPending}
            className="w-full bg-primary text-primary-foreground font-black py-3 rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {signup.isPending ? "..." : t("register")}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-4">
          {t("login")}?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            {t("login")}
          </Link>
        </p>
      </div>
    </div>
  );
}
