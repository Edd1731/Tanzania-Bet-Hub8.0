import { useState } from "react";
import { useCreateDeposit, useGetMyDeposits, getGetMyDepositsQueryKey } from "@workspace/api-client-react";
import { useTranslation } from "@/hooks/use-translation";
import { useQueryClient } from "@tanstack/react-query";

const METHODS = [
  { key: "mpesa", label: "M-Pesa", color: "bg-[#00A651]/10 border-[#00A651]/40 text-[#00A651]" },
  { key: "tigopesa", label: "TigoPesa", color: "bg-blue-500/10 border-blue-500/40 text-blue-400" },
  { key: "halopesa", label: "HaloPesa", color: "bg-orange-500/10 border-orange-500/40 text-orange-400" },
  { key: "airtel", label: "Airtel Money", color: "bg-red-500/10 border-red-500/40 text-red-400" },
] as const;

type Method = typeof METHODS[number]["key"];

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-400",
    approved: "bg-green-500/15 text-green-400",
    rejected: "bg-red-500/15 text-red-400",
  };
  const label: Record<string, string> = {
    pending: t("pending"),
    approved: t("approve"),
    rejected: t("reject"),
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {label[status] ?? status}
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(false);
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError("Invalid amount"); return; }
    try {
      await createDeposit.mutateAsync({ data: { amount: amt, txId, method } });
      setSuccess(true);
      setAmount(""); setTxId("");
      qc.invalidateQueries({ queryKey: getGetMyDepositsQueryKey() });
    } catch (err: any) {
      setError(err?.data?.message || err?.message || "Error");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-black text-foreground mb-6">{t("deposit")}</h1>

      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-4">{t("method")}</h2>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {METHODS.map(m => (
            <button
              key={m.key}
              onClick={() => setMethod(m.key)}
              className={`border rounded-xl py-3 px-4 text-sm font-bold transition-all ${
                method === m.key
                  ? m.color + " shadow-sm"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg px-3 py-2">
              Deposit submitted! Pending admin approval.
            </div>
          )}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              {t("amount")} (TZS)
            </label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required min="500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              {t("transaction_id")}
            </label>
            <input
              type="text"
              value={txId}
              onChange={e => setTxId(e.target.value)}
              placeholder="e.g. HXY12345678"
              className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Send money to <span className="text-primary font-bold">0744 123 456</span> then paste your transaction ID here.
            </p>
          </div>

          <button
            type="submit"
            disabled={createDeposit.isPending}
            className="w-full bg-primary text-primary-foreground font-black py-3 rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {createDeposit.isPending ? "..." : t("submit")}
          </button>
        </form>
      </div>

      {/* Deposit history */}
      <h2 className="text-lg font-black text-foreground mb-3">{t("deposits")}</h2>
      {isLoading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 bg-card rounded-xl animate-pulse border border-border" />)}</div>
      ) : deposits?.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t("no_deposits")}</p>
      ) : (
        <div className="space-y-2">
          {[...deposits ?? []].reverse().map(tx => (
            <div key={tx.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-foreground text-sm">TZS {Number(tx.amount).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{tx.method} &middot; {tx.txId}</div>
              </div>
              <div className="text-right">
                <StatusBadge status={tx.status} />
                <div className="text-xs text-muted-foreground mt-1">
                  {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
