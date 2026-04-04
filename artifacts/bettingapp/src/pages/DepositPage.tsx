import { useState } from "react";
import { useCreateDeposit, useGetMyDeposits, getGetMyDepositsQueryKey } from "@workspace/api-client-react";
import { useTranslation } from "@/hooks/use-translation";
import { useQueryClient } from "@tanstack/react-query";

const GOLD = "#FDD017";
const NAVY = "#0d1f3c";

const METHODS = [
  {
    key: "mpesa",
    label: "M-Pesa",
    number: "0744 123 456",
    color: "#00A651",
    bg: "rgba(0,166,81,0.12)",
    border: "rgba(0,166,81,0.3)",
    logo: "📱",
  },
  {
    key: "tigopesa",
    label: "Tigo Pesa",
    number: "0712 123 456",
    color: "#009BDE",
    bg: "rgba(0,155,222,0.12)",
    border: "rgba(0,155,222,0.3)",
    logo: "📲",
  },
  {
    key: "halopesa",
    label: "HaloPesa",
    number: "0621 123 456",
    color: "#F7941D",
    bg: "rgba(247,148,29,0.12)",
    border: "rgba(247,148,29,0.3)",
    logo: "💳",
  },
  {
    key: "airtel",
    label: "Airtel Money",
    number: "0684 123 456",
    color: "#ED1C24",
    bg: "rgba(237,28,36,0.12)",
    border: "rgba(237,28,36,0.3)",
    logo: "📡",
  },
] as const;

type Method = typeof METHODS[number]["key"];

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "rgba(253,208,23,0.12)", text: "#FDD017", label: "Pending" },
    approved: { bg: "rgba(27,138,60,0.15)", text: "#4ade80", label: "Approved" },
    rejected: { bg: "rgba(239,68,68,0.12)", text: "#f87171", label: "Rejected" },
  };
  const c = colors[status] ?? { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.4)", label: status };
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>
      {c.label}
    </span>
  );
}

export default function DepositPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const createDeposit = useCreateDeposit();
  const { data: deposits, isLoading } = useGetMyDeposits({ query: { queryKey: getGetMyDepositsQueryKey() } });

  const [method, setMethod] = useState<Method>("mpesa");
  const [amount, setAmount] = useState("");
  const [txId, setTxId] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  const selectedMethod = METHODS.find(m => m.key === method)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(false);
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError("Invalid amount"); return; }
    try {
      await createDeposit.mutateAsync({ data: { amount: amt, txId, method } });
      setSuccess(true);
      setAmount(""); setTxId("");
      setStep(1);
      qc.invalidateQueries({ queryKey: getGetMyDepositsQueryKey() });
    } catch (err: any) {
      setError(err?.data?.message || err?.message || "Error");
    }
  };

  return (
    <div className="max-w-lg mx-auto px-3 pt-4 pb-6">
      {/* Page title */}
      <div className="mb-4">
        <h1 className="text-xl font-black text-white">{t("deposit")}</h1>
        <p className="text-xs text-white/40 mt-0.5">Fund your account instantly</p>
      </div>

      {/* ── Step 1: Choose method + amount ── */}
      <div className="rounded-2xl overflow-hidden mb-4" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: NAVY, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-black" style={{ background: GOLD }}>1</div>
          <span className="text-sm font-black text-white">Choose Payment Method</span>
        </div>

        {/* Methods grid */}
        <div className="p-4 grid grid-cols-2 gap-2">
          {METHODS.map(m => (
            <button
              key={m.key}
              onClick={() => setMethod(m.key)}
              className="rounded-xl py-3 px-3 text-left transition-all"
              style={{
                background: method === m.key ? m.bg : "rgba(255,255,255,0.04)",
                border: `1px solid ${method === m.key ? m.border : "rgba(255,255,255,0.06)"}`,
              }}
            >
              <div className="text-xl mb-1">{m.logo}</div>
              <div className="text-xs font-black" style={{ color: method === m.key ? m.color : "rgba(255,255,255,0.7)" }}>
                {m.label}
              </div>
              <div className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{m.number}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Step 2: Amount + TxID ── */}
      <div className="rounded-2xl overflow-hidden mb-4" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: NAVY, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-black" style={{ background: GOLD }}>2</div>
          <span className="text-sm font-black text-white">Amount &amp; Confirmation</span>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {success && (
            <div className="rounded-xl px-3 py-2.5 text-sm font-semibold text-green-400" style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)" }}>
              ✓ Deposit submitted! Pending admin approval.
            </div>
          )}
          {error && (
            <div className="rounded-xl px-3 py-2.5 text-sm text-red-400" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
              {error}
            </div>
          )}

          {/* Send-to instructions */}
          <div className="rounded-xl px-3 py-2.5 flex items-center justify-between" style={{ background: "rgba(253,208,23,0.07)", border: `1px solid ${GOLD}30` }}>
            <div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Send {selectedMethod.label} to</div>
              <div className="text-base font-black text-white">{selectedMethod.number}</div>
            </div>
            <div className="text-2xl">{selectedMethod.logo}</div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">
              {t("amount")} (TZS)
            </label>
            {/* Quick amounts */}
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {QUICK_AMOUNTS.map(q => (
                <button
                  key={q} type="button"
                  onClick={() => setAmount(String(q))}
                  className="py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: amount === String(q) ? GOLD : "rgba(255,255,255,0.06)",
                    color: amount === String(q) ? "#000" : "rgba(255,255,255,0.5)",
                    border: `1px solid ${amount === String(q) ? GOLD : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  {q >= 1000 ? `${q / 1000}K` : q}
                </button>
              ))}
            </div>
            <input
              type="number" value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="or enter custom amount..."
              className="w-full rounded-xl px-3 py-3 text-sm text-white font-bold outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              required min="500"
            />
          </div>

          {/* Transaction ID */}
          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">
              {t("transaction_id")}
            </label>
            <input
              type="text" value={txId}
              onChange={e => setTxId(e.target.value)}
              placeholder="e.g. HXY12345678"
              className="w-full rounded-xl px-3 py-3 text-sm text-white font-bold outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              required
            />
            <p className="text-[10px] text-white/30 mt-1.5">
              After sending, paste the M-Pesa/mobile money confirmation code here.
            </p>
          </div>

          <button
            type="submit"
            disabled={createDeposit.isPending}
            className="w-full py-4 rounded-xl text-sm font-black text-black disabled:opacity-50 transition-opacity"
            style={{ background: GOLD }}
          >
            {createDeposit.isPending ? "Submitting..." : "Deposit Now →"}
          </button>
        </form>
      </div>

      {/* ── Transaction history ── */}
      <div>
        <h2 className="text-sm font-black text-white mb-3">Transaction History</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "#111827" }} />)}
          </div>
        ) : !deposits?.length ? (
          <div className="text-center py-8 text-white/30 text-sm">{t("no_deposits")}</div>
        ) : (
          <div className="space-y-2">
            {[...deposits].reverse().map(tx => {
              const m = METHODS.find(x => x.key === tx.method);
              return (
                <div key={tx.id} className="rounded-xl px-4 py-3 flex items-center justify-between gap-4" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{m?.logo ?? "💰"}</span>
                    <div>
                      <div className="font-black text-white text-sm">TZS {Number(tx.amount).toLocaleString()}</div>
                      <div className="text-[10px] text-white/30">{m?.label ?? tx.method} · {tx.txId}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={tx.status} />
                    <div className="text-[10px] text-white/20 mt-1">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
