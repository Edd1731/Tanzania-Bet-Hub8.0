import { useState } from "react";
import { useSignup } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/use-translation";
import { Link, useLocation } from "wouter";

const GOLD = "#FDD017";

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
      const res = await signup.mutateAsync({ data: { name, phone, password } });
      setToken(res.token);
      navigate("/");
    } catch (err: any) {
      setError(err?.data?.message || err?.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 py-10">
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
              <span className="text-white font-black text-xl drop-shadow-lg">Betpesaa</span>
            </div>
          </div>
          <h1 className="text-2xl font-black text-white">Create Account</h1>
          <p className="text-white/40 text-sm mt-1">Join Betpesaa today — it's free!</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="rounded-2xl p-6 space-y-4" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
          {error && (
            <div className="rounded-lg px-3 py-2 text-sm text-red-400" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">{t("name")}</label>
            <input
              type="text" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full rounded-xl px-3 py-3 text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">{t("phone")}</label>
            <input
              type="tel" value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="07XXXXXXXX"
              className="w-full rounded-xl px-3 py-3 text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">{t("password")}</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full rounded-xl px-3 py-3 text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              required minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={signup.isPending}
            className="w-full font-black py-3.5 rounded-xl text-sm text-black disabled:opacity-50 transition-opacity"
            style={{ background: GOLD }}
          >
            {signup.isPending ? "Creating account..." : "Create Account"}
          </button>

          <p className="text-[10px] text-center text-white/20 leading-relaxed">
            By registering you agree to our Terms of Service and confirm you are 18+ years old.
          </p>
        </form>

        <p className="text-center text-sm text-white/40 mt-4">
          Already have an account?{" "}
          <Link href="/login" className="font-black hover:underline" style={{ color: GOLD }}>
            {t("login")}
          </Link>
        </p>
      </div>
    </div>
  );
}
