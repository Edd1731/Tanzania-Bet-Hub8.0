import { useState } from "react";
import {
  useCreateWithdrawal,
  useGetMyWithdrawals,
  getGetMyWithdrawalsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";

const GOLD = "#FDD017";
const NAVY = "#0d1f3c";

const METHODS = [
  { key: "mpesa",    label: "M-Pesa",       color: "#00A651", bg: "rgba(0,166,81,0.15)",   border: "rgba(0,166,81,0.3)",   prefix: "07", placeholder: "0744 123 456", icon: "📱", bank: "CRDB / NMB" },
  { key: "tigopesa", label: "Tigo Pesa",    color: "#009BDE", bg: "rgba(0,155,222,0.12)",  border: "rgba(0,155,222,0.25)", prefix: "07", placeholder: "0712 123 456", icon: "📲", bank: "Tigo Pesa" },
  { key: "halopesa", label: "HaloPesa",     color: "#F7941D", bg: "rgba(247,148,29,0.12)", border: "rgba(247,148,29,0.25)", prefix: "06", placeholder: "0621 123 456", icon: "💳", bank: "Viettel" },
  { key: "airtel",   label: "Airtel Money", color: "#ED1C24", bg: "rgba(237,28,36,0.12)",  border: "rgba(237,28,36,0.25)", prefix: "06", placeholder: "0684 123 456", icon: "📡", bank: "Airtel TZ" },
];

const QUICK = [2000, 5000, 10000, 20000, 50000, 100000];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    pending:  ["rgba(253,208,23,0.12)",  GOLD],
    approved: ["rgba(27,138,60,0.15)",   "#4ade80"],
    rejected: ["rgba(239,68,68,0.12)",   "#f87171"],
  };
  const [bg, color] = map[status] ?? ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.4)"];
  return (
    <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ background: bg, color }}>
      {status}
    </span>
  );
}

export default function WithdrawPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [method, setMethod]   = useState("mpesa");
  const [phone, setPhone]     = useState(user?.phone ?? "");
  const [amount, setAmount]   = useState("");
  const [msg, setMsg]         = useState<{ ok: boolean; text: string } | null>(null);
  const [step, setStep]       = useState<"form" | "done">("form");

  const { data: history, isLoading: histLoading } = useGetMyWithdrawals({
    query: { queryKey: getGetMyWithdrawalsQueryKey() },
  });

  const createWithdrawal = useCreateWithdrawal();

  const balance = Number(user?.balance ?? 0);
  const amountNum = parseFloat(amount) || 0;
  const selectedMethod = METHODS.find(m => m.key === method)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (amountNum < 1000) { setMsg({ ok: false, text: "Minimum withdrawal is TZS 1,000" }); return; }
    if (amountNum > balance) { setMsg({ ok: false, text: "Amount exceeds your available balance" }); return; }
    if (!phone.trim() || phone.trim().length < 9) { setMsg({ ok: false, text: "Enter a valid mobile phone number" }); return; }

    try {
      await createWithdrawal.mutateAsync({ data: { amount: amountNum, phone: phone.trim(), method } });
      qc.invalidateQueries({ queryKey: getGetMyWithdrawalsQueryKey() });
      setStep("done");
    } catch (err: any) {
      setMsg({ ok: false, text: err?.data?.message ?? err?.message ?? "Something went wrong" });
    }
  };

  if (step === "done") {
    return (
      <div className="max-w-lg mx-auto px-4 pt-10 pb-10 flex flex-col items-center text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
          style={{ background: "rgba(27,138,60,0.15)", border: "2px solid rgba(74,222,128,0.4)" }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-xl font-black text-white mb-2">Withdrawal Submitted!</h2>
        <p className="text-sm text-white/50 mb-1">
          Your request to withdraw <span className="text-white font-bold">TZS {amountNum.toLocaleString()}</span> via{" "}
          <span style={{ color: selectedMethod.color }}>{selectedMethod.label}</span> has been received.
        </p>
        <p className="text-xs text-white/30 mb-6">
          Funds will be sent to <span className="text-white/60">{phone}</span> within 30 minutes.
        </p>
        <div
          className="w-full px-5 py-4 rounded-2xl text-left mb-6 space-y-2"
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {[
            ["Amount", `TZS ${amountNum.toLocaleString()}`],
            ["Method", selectedMethod.label],
            ["Sent to", phone],
            ["Status", "Pending Review"],
            ["Processing time", "Up to 30 minutes"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm">
              <span className="text-white/40">{k}</span>
              <span className="text-white font-semibold">{v}</span>
            </div>
          ))}
        </div>
        <Link
          href="/"
          className="block w-full py-3.5 rounded-xl font-black text-sm text-black text-center"
          style={{ background: GOLD }}
        >
          Back to Events
        </Link>
        <button
          onClick={() => { setStep("form"); setAmount(""); setMsg(null); }}
          className="mt-3 text-xs text-white/30 underline"
        >
          Make another withdrawal
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center text-white/50"
            style={{ background: "rgba(255,255,255,0.06)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        </Link>
        <div>
          <h1 className="text-lg font-black text-white">Withdraw Funds</h1>
          <p className="text-xs text-white/40">Send to your mobile money account</p>
        </div>
      </div>

      {/* Balance card */}
      <div
        className="rounded-2xl px-5 py-4 mb-5 flex items-center justify-between"
        style={{ background: NAVY, border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-widest">Available Balance</div>
          <div className="text-2xl font-black mt-0.5" style={{ color: GOLD }}>
            TZS {balance.toLocaleString()}
          </div>
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: `${GOLD}20` }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Choose method */}
        <div>
          <div className="text-[11px] font-black text-white/40 uppercase tracking-widest mb-3">
            1. Choose Mobile Money Provider
          </div>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map(m => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMethod(m.key)}
                className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-left transition-all"
                style={{
                  background: method === m.key ? m.bg : "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${method === m.key ? m.border : "rgba(255,255,255,0.07)"}`,
                }}
              >
                <span className="text-xl shrink-0">{m.icon}</span>
                <div className="min-w-0">
                  <div className="text-xs font-black truncate" style={{ color: method === m.key ? m.color : "white" }}>{m.label}</div>
                  <div className="text-[9px] text-white/30 truncate">{m.bank}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Phone */}
        <div>
          <div className="text-[11px] font-black text-white/40 uppercase tracking-widest mb-2">
            2. {selectedMethod.label} Phone Number
          </div>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder={selectedMethod.placeholder}
            className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/25 outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <p className="text-[10px] text-white/25 mt-1.5">
            Make sure the number is registered with {selectedMethod.label}.
          </p>
        </div>

        {/* Step 3: Amount */}
        <div>
          <div className="text-[11px] font-black text-white/40 uppercase tracking-widest mb-2">
            3. Amount (TZS)
          </div>
          {/* Quick amounts */}
          <div className="grid grid-cols-3 gap-2 mb-2.5">
            {QUICK.map(q => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(String(q))}
                className="py-2 rounded-xl text-xs font-black transition-all"
                style={{
                  background: amount === String(q) ? `${GOLD}20` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${amount === String(q) ? GOLD + "60" : "rgba(255,255,255,0.08)"}`,
                  color: amount === String(q) ? GOLD : "rgba(255,255,255,0.6)",
                }}
              >
                {q >= 1000 ? `${q / 1000}K` : q}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Enter amount e.g. 15000"
            min={1000}
            max={balance}
            className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/25 outline-none"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${amountNum > balance && amountNum > 0 ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
            }}
          />
          <div className="flex justify-between mt-1.5">
            <p className="text-[10px] text-white/25">Min: TZS 1,000</p>
            {amountNum > 0 && amountNum > balance && (
              <p className="text-[10px] text-red-400">Exceeds balance</p>
            )}
            {amountNum >= 1000 && amountNum <= balance && (
              <p className="text-[10px]" style={{ color: "#4ade80" }}>
                Remaining: TZS {(balance - amountNum).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Info box */}
        <div
          className="px-4 py-3 rounded-xl flex gap-3"
          style={{ background: "rgba(253,208,23,0.06)", border: "1px solid rgba(253,208,23,0.15)" }}
        >
          <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-[11px] text-white/40 leading-relaxed">
            Withdrawals are processed within <strong className="text-white/60">30 minutes</strong>. Ensure the phone number belongs to the selected provider. No fees charged.
          </p>
        </div>

        {/* Error/feedback */}
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
          type="submit"
          disabled={createWithdrawal.isPending || amountNum < 1000 || amountNum > balance}
          className="w-full py-4 rounded-xl font-black text-base text-black transition-opacity"
          style={{ background: GOLD, opacity: createWithdrawal.isPending || amountNum < 1000 || amountNum > balance ? 0.5 : 1 }}
        >
          {createWithdrawal.isPending ? "Processing..." : `Withdraw TZS ${amountNum > 0 ? amountNum.toLocaleString() : ""}`}
        </button>
      </form>

      {/* Withdrawal history */}
      {(history && history.length > 0) && (
        <div className="mt-8">
          <div className="text-[11px] font-black text-white/40 uppercase tracking-widest mb-3">Withdrawal History</div>
          <div className="space-y-2">
            {[...history].reverse().slice(0, 8).map(w => (
              <div
                key={w.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg shrink-0">{METHODS.find(m => m.key === w.method)?.icon ?? "💸"}</span>
                  <div>
                    <div className="text-xs font-bold text-white">
                      {METHODS.find(m => m.key === w.method)?.label ?? w.method}
                    </div>
                    <div className="text-[10px] text-white/30">{w.phone} · {new Date(w.createdAt!).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-white">TZS {Number(w.amount).toLocaleString()}</div>
                  <div className="mt-0.5"><StatusBadge status={w.status} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
