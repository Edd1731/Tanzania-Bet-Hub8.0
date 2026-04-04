import { useState } from "react";
import {
  useAdminGetStats, useAdminGetTransactions, useAdminApproveTransaction, useAdminRejectTransaction,
  useAdminGetBets, useAdminSettleBet, useAdminCreateEvent, useAdminGetUsers,
  useAdminGetWithdrawals, useAdminApproveWithdrawal, useAdminRejectWithdrawal,
  useAdminCreateUser, useAdminEditBalance,
  getAdminGetTransactionsQueryKey, getAdminGetBetsQueryKey, getAdminGetStatsQueryKey,
  getAdminGetUsersQueryKey, getAdminGetWithdrawalsQueryKey, getGetEventsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks/use-translation";

const GOLD  = "#FDD017";
const GREEN = "#1B8A3C";
const NAVY  = "#0d1f3c";

type Tab = "stats" | "deposits" | "withdrawals" | "bets" | "events" | "users";

// ─── Sync button ──────────────────────────────────────────────────────────────
function SyncButton() {
  const qc = useQueryClient();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const sync = async () => {
    setState("loading");
    try {
      const token = localStorage.getItem("bettz_token");
      const res = await fetch("/api/admin/sync-fixtures", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Sync failed");
      setState("done");
      qc.invalidateQueries({ queryKey: getGetEventsQueryKey() });
      setTimeout(() => setState("idle"), 3000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };
  return (
    <button onClick={sync} disabled={state === "loading"}
      className="text-[10px] font-black px-3 py-1.5 rounded-lg shrink-0 transition-all"
      style={{
        background: state === "done" ? "rgba(74,222,128,0.2)" : state === "error" ? "rgba(239,68,68,0.2)" : "rgba(253,208,23,0.15)",
        color: state === "done" ? "#4ade80" : state === "error" ? "#f87171" : GOLD,
        border: `1px solid ${state === "done" ? "rgba(74,222,128,0.4)" : state === "error" ? "rgba(239,68,68,0.3)" : "rgba(253,208,23,0.3)"}`,
      }}>
      {state === "loading" ? "Syncing…" : state === "done" ? "✓ Synced" : state === "error" ? "✗ Error" : "Sync Now"}
    </button>
  );
}

// ─── Stat box ─────────────────────────────────────────────────────────────────
function StatBox({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-xl px-4 py-4" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</div>
      <div className="text-2xl font-black" style={{ color: accent ?? "white" }}>{value}</div>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  pending: "#FDD017", approved: "#4ade80", rejected: "#f87171",
  won: "#4ade80", lost: "#f87171",
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? "rgba(255,255,255,0.4)";
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
      style={{ background: `${c}18`, color: c, border: `1px solid ${c}40` }}>
      {status.toUpperCase()}
    </span>
  );
}

// ─── Action buttons ───────────────────────────────────────────────────────────
function Approve({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-lg transition-all hover:brightness-110"
      style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}>
      ✓ Approve
    </button>
  );
}
function Reject({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-lg transition-all hover:brightness-110"
      style={{ background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)" }}>
      ✕ Reject
    </button>
  );
}

// ─── Balance editor (inline per-user) ────────────────────────────────────────
function BalanceEditor({ userId, currentBalance, onDone }: { userId: number; currentBalance: number; onDone: () => void }) {
  const qc = useQueryClient();
  const editBalance = useAdminEditBalance();
  const [mode, setMode] = useState<"set" | "add" | "subtract">("add");
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const preview = () => {
    const n = parseFloat(amount) || 0;
    if (mode === "set")      return n;
    if (mode === "add")      return currentBalance + n;
    return Math.max(0, currentBalance - n);
  };

  const handleSubmit = async () => {
    const n = parseFloat(amount);
    if (isNaN(n) || n < 0) { setErr("Enter a valid amount"); return; }
    setBusy(true); setErr("");
    try {
      await editBalance.mutateAsync({ id: userId, data: { mode, amount: n } });
      qc.invalidateQueries({ queryKey: getAdminGetUsersQueryKey() });
      qc.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
      onDone();
    } catch (e: any) {
      setErr(e?.data?.message || e?.message || "Error");
    }
    setBusy(false);
  };

  return (
    <div className="mt-3 p-3 rounded-xl space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: GOLD }}>Edit Balance</div>

      {/* Mode toggle */}
      <div className="flex gap-1">
        {(["add", "subtract", "set"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className="flex-1 text-[10px] font-black py-1.5 rounded-lg capitalize transition-all"
            style={{
              background: mode === m ? GOLD : "rgba(255,255,255,0.06)",
              color: mode === m ? "#000" : "rgba(255,255,255,0.5)",
            }}>
            {m === "add" ? "+ Add" : m === "subtract" ? "− Subtract" : "= Set"}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div className="flex gap-2">
        <div className="flex items-center flex-1 rounded-lg px-3" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <span className="text-xs text-white/30 mr-1.5">TZS</span>
          <input
            type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="Amount…"
            className="flex-1 bg-transparent text-white font-bold text-sm py-2 outline-none"
            min="0"
          />
        </div>
        <button onClick={handleSubmit} disabled={busy}
          className="px-4 py-2 rounded-lg text-xs font-black transition-all disabled:opacity-50"
          style={{ background: GREEN, color: "white" }}>
          {busy ? "…" : "Save"}
        </button>
        <button onClick={onDone}
          className="px-3 py-2 rounded-lg text-xs font-bold"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
          ✕
        </button>
      </div>

      {/* Preview */}
      <div className="text-[10px] text-white/40">
        New balance: <span className="font-black" style={{ color: GOLD }}>TZS {preview().toLocaleString()}</span>
      </div>

      {err && <div className="text-xs text-red-400">{err}</div>}
    </div>
  );
}

// ─── Add User form ────────────────────────────────────────────────────────────
function AddUserForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const createUser = useAdminCreateUser();
  const [form, setForm] = useState({ name: "", phone: "", password: "", initialBalance: "0", isAdmin: false });
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setSuccess("");
    try {
      await createUser.mutateAsync({ data: {
        name: form.name, phone: form.phone, password: form.password,
        initialBalance: parseFloat(form.initialBalance) || 0,
        isAdmin: form.isAdmin,
      } });
      setSuccess("User created successfully!");
      setForm({ name: "", phone: "", password: "", initialBalance: "0", isAdmin: false });
      qc.invalidateQueries({ queryKey: getAdminGetUsersQueryKey() });
      qc.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
      setTimeout(() => { setSuccess(""); onDone(); }, 1500);
    } catch (e: any) {
      setErr(e?.data?.message || e?.message || "Failed to create user");
    }
  };

  const inp = "w-full rounded-lg px-3 py-2.5 text-sm text-white font-semibold outline-none transition-all";
  const inpStyle = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" };
  const lbl = "text-[10px] font-black uppercase tracking-widest mb-1 block";

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-5 mb-6 space-y-4"
      style={{ background: "#111827", border: `1px solid ${GOLD}30` }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">👤</span>
        <span className="font-black text-sm" style={{ color: GOLD }}>Add New User</span>
        <button type="button" onClick={onDone} className="ml-auto text-xs text-white/30 hover:text-white">✕ Cancel</button>
      </div>

      {success && (
        <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>
          ✓ {success}
        </div>
      )}
      {err && (
        <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
          {err}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl} style={{ color: "rgba(255,255,255,0.4)" }}>Full Name</label>
          <input className={inp} style={inpStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. John Doe" />
        </div>
        <div>
          <label className={lbl} style={{ color: "rgba(255,255,255,0.4)" }}>Phone</label>
          <input className={inp} style={inpStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required placeholder="e.g. 0712345678" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl} style={{ color: "rgba(255,255,255,0.4)" }}>Password</label>
          <input type="password" className={inp} style={inpStyle} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required placeholder="Min 4 chars" />
        </div>
        <div>
          <label className={lbl} style={{ color: "rgba(255,255,255,0.4)" }}>Initial Balance (TZS)</label>
          <input type="number" className={inp} style={inpStyle} value={form.initialBalance} onChange={e => setForm(f => ({ ...f, initialBalance: e.target.value }))} min="0" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button"
          onClick={() => setForm(f => ({ ...f, isAdmin: !f.isAdmin }))}
          className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg transition-all"
          style={{
            background: form.isAdmin ? "rgba(253,208,23,0.15)" : "rgba(255,255,255,0.05)",
            color: form.isAdmin ? GOLD : "rgba(255,255,255,0.4)",
            border: `1px solid ${form.isAdmin ? "rgba(253,208,23,0.4)" : "rgba(255,255,255,0.08)"}`,
          }}>
          <span>{form.isAdmin ? "👑" : "👤"}</span>
          {form.isAdmin ? "Admin account" : "Regular user"}
        </button>
        <button type="submit" disabled={createUser.isPending}
          className="flex-1 py-2.5 rounded-xl font-black text-sm text-black disabled:opacity-50 transition-opacity"
          style={{ background: GOLD }}>
          {createUser.isPending ? "Creating…" : "Create User"}
        </button>
      </div>
    </form>
  );
}

// ─── Main AdminPage ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("stats");
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const { data: stats } = useAdminGetStats({ query: { queryKey: getAdminGetStatsQueryKey() } });
  const { data: transactions, isLoading: txLoading } = useAdminGetTransactions({ query: { queryKey: getAdminGetTransactionsQueryKey(), enabled: activeTab === "deposits" } });
  const { data: withdrawals, isLoading: wdLoading } = useAdminGetWithdrawals({ query: { queryKey: getAdminGetWithdrawalsQueryKey(), enabled: activeTab === "withdrawals" } });
  const { data: bets, isLoading: betsLoading } = useAdminGetBets({ query: { queryKey: getAdminGetBetsQueryKey(), enabled: activeTab === "bets" } });
  const { data: users, isLoading: usersLoading } = useAdminGetUsers({ query: { queryKey: getAdminGetUsersQueryKey(), enabled: activeTab === "users" } });

  const approveTx = useAdminApproveTransaction();
  const rejectTx  = useAdminRejectTransaction();
  const approveWd = useAdminApproveWithdrawal();
  const rejectWd  = useAdminRejectWithdrawal();
  const settleBet = useAdminSettleBet();
  const createEvent = useAdminCreateEvent();

  const [eventForm, setEventForm] = useState({
    teamHome: "", teamAway: "", league: "NBC Premier League",
    oddsHome: "2.0", oddsDraw: "3.0", oddsAway: "2.5", startsAt: "",
  });
  const [eventSuccess, setEventSuccess] = useState("");
  const [eventError, setEventError]     = useState("");

  const handleApprove    = async (id: number) => { await approveTx.mutateAsync({ id }); qc.invalidateQueries({ queryKey: getAdminGetTransactionsQueryKey() }); qc.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() }); };
  const handleReject     = async (id: number) => { await rejectTx.mutateAsync({ id });  qc.invalidateQueries({ queryKey: getAdminGetTransactionsQueryKey() }); qc.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() }); };
  const handleApproveWd  = async (id: number) => { await approveWd.mutateAsync({ id }); qc.invalidateQueries({ queryKey: getAdminGetWithdrawalsQueryKey() }); qc.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() }); };
  const handleRejectWd   = async (id: number) => { await rejectWd.mutateAsync({ id });  qc.invalidateQueries({ queryKey: getAdminGetWithdrawalsQueryKey() }); qc.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() }); };
  const handleSettle     = async (id: number, outcome: "won" | "lost") => { await settleBet.mutateAsync({ id, data: { outcome } }); qc.invalidateQueries({ queryKey: getAdminGetBetsQueryKey() }); qc.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() }); };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault(); setEventError(""); setEventSuccess("");
    try {
      await createEvent.mutateAsync({ data: {
        teamHome: eventForm.teamHome, teamAway: eventForm.teamAway, league: eventForm.league,
        oddsHome: parseFloat(eventForm.oddsHome), oddsDraw: parseFloat(eventForm.oddsDraw), oddsAway: parseFloat(eventForm.oddsAway),
        startsAt: eventForm.startsAt || undefined,
      } });
      setEventSuccess("Event created!");
      setEventForm({ teamHome: "", teamAway: "", league: "NBC Premier League", oddsHome: "2.0", oddsDraw: "3.0", oddsAway: "2.5", startsAt: "" });
    } catch (err: any) { setEventError(err?.data?.message || err?.message || "Error"); }
  };

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "stats",       label: "Overview" },
    { key: "deposits",    label: "Deposits",    badge: (stats?.pendingDeposits ?? 0) || undefined },
    { key: "withdrawals", label: "Withdrawals", badge: ((stats as any)?.pendingWithdrawals ?? 0) || undefined },
    { key: "bets",        label: "Bets" },
    { key: "events",      label: "Events" },
    { key: "users",       label: "Users",       badge: (stats?.totalUsers ?? 0) || undefined },
  ];

  const inp    = "w-full rounded-lg px-3 py-2.5 text-sm text-white font-semibold outline-none transition-all";
  const inpSty = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6" style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-8 rounded-full" style={{ background: GOLD }} />
        <h1 className="text-2xl font-black text-white">Admin Panel</h1>
        <span className="text-xs px-2 py-0.5 rounded-full font-bold ml-auto"
          style={{ background: "rgba(253,208,23,0.12)", color: GOLD, border: `1px solid ${GOLD}30` }}>
          Betpesaa
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6 overflow-x-auto scrollbar-none" style={{ background: "#111827" }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="relative whitespace-nowrap flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all"
            style={{
              background: activeTab === tab.key ? NAVY : "transparent",
              color: activeTab === tab.key ? GOLD : "rgba(255,255,255,0.45)",
              border: activeTab === tab.key ? `1px solid ${GOLD}25` : "1px solid transparent",
            }}>
            {tab.label}
            {tab.badge ? (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: tab.key === "users" ? "rgba(255,255,255,0.1)" : "rgba(253,208,23,0.2)", color: tab.key === "users" ? "rgba(255,255,255,0.5)" : GOLD }}>
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ── STATS ── */}
      {activeTab === "stats" && (
        <div className="space-y-4">
          {/* API Status banners */}
          {[
            {
              active: (stats as any)?.mpesaApiActive,
              label: (stats as any)?.mpesaApiActive ? "M-Pesa Live Verification Active" : "M-Pesa: Pattern-Match Fallback",
              sub: (stats as any)?.mpesaApiActive ? "Deposits verified against Vodacom TZ API" : "Add MPESA_TZ_API_KEY + PUBLIC_KEY + SHORTCODE in Secrets",
              icon: (stats as any)?.mpesaApiActive ? "🔗" : "⚠️",
              extra: null,
            },
            {
              active: (stats as any)?.footballApiActive,
              label: (stats as any)?.footballApiActive ? "Live Football API Active" : "Live Fixtures: Not Configured",
              sub: (stats as any)?.footballApiActive ? "Syncing every 5 min from RapidAPI" : "Add RAPIDAPI_KEY in Secrets to enable fixture sync",
              icon: (stats as any)?.footballApiActive ? "⚽" : "⚠️",
              extra: (stats as any)?.footballApiActive ? <SyncButton /> : null,
            },
          ].map((b, i) => (
            <div key={i} className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
              style={{
                background: b.active ? "rgba(27,138,60,0.1)" : "rgba(253,208,23,0.06)",
                border: `1px solid ${b.active ? "rgba(74,222,128,0.25)" : "rgba(253,208,23,0.15)"}`,
              }}>
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: b.active ? "#4ade80" : GOLD }} />
                <div>
                  <div className="text-xs font-black" style={{ color: b.active ? "#4ade80" : GOLD }}>{b.label}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{b.sub}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {b.extra}
                <span className="text-base">{b.icon}</span>
              </div>
            </div>
          ))}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Total Users"       value={stats?.totalUsers ?? 0}    accent={GOLD} />
            <StatBox label="Total Bets"        value={stats?.totalBets ?? 0} />
            <StatBox label="Active Bets"       value={stats?.activeBets ?? 0}    accent={GOLD} />
            <StatBox label="Pending Deposits"  value={stats?.pendingDeposits ?? 0} accent={stats?.pendingDeposits ? "#FDD017" : undefined} />
            <StatBox label="Pending Withdrawals" value={(stats as any)?.pendingWithdrawals ?? 0} accent={(stats as any)?.pendingWithdrawals ? "#FDD017" : undefined} />
            <StatBox label="Total Deposited"   value={`TZS ${Number(stats?.totalDeposited ?? 0).toLocaleString()}`} accent="#4ade80" />
            <StatBox label="Total Withdrawn"   value={`TZS ${Number((stats as any)?.totalWithdrawn ?? 0).toLocaleString()}`} />
            <StatBox label="Total Paid Out"    value={`TZS ${Number(stats?.totalPaidOut ?? 0).toLocaleString()}`} accent="#4ade80" />
          </div>
        </div>
      )}

      {/* ── DEPOSITS ── */}
      {activeTab === "deposits" && (
        <div className="space-y-2">
          <div className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
            All Deposits · {transactions?.length ?? 0} total
          </div>
          {txLoading ? (
            [1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#111827" }} />)
          ) : transactions?.length === 0 ? (
            <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.3)" }}>No deposits yet</div>
          ) : [...(transactions ?? [])].reverse().map(tx => (
            <div key={tx.id} className="rounded-xl px-4 py-3 flex items-center justify-between gap-4"
              style={{ background: "#111827", border: `1px solid ${tx.status === "pending" ? `${GOLD}25` : "rgba(255,255,255,0.06)"}` }}>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-sm">
                  {tx.user?.name} <span className="text-white/40 font-normal text-xs">({tx.user?.phone})</span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {tx.method?.toUpperCase()} · <span className="font-mono">{tx.txId}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="font-black text-white">TZS {Number(tx.amount).toLocaleString()}</div>
                  <StatusBadge status={tx.status} />
                </div>
                {tx.status === "pending" && (
                  <div className="flex gap-1.5">
                    <Approve onClick={() => handleApprove(tx.id)} />
                    <Reject  onClick={() => handleReject(tx.id)} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── WITHDRAWALS ── */}
      {activeTab === "withdrawals" && (
        <div className="space-y-2">
          <div className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
            All Withdrawals · {withdrawals?.length ?? 0} total
          </div>
          {wdLoading ? (
            [1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#111827" }} />)
          ) : withdrawals?.length === 0 ? (
            <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.3)" }}>No withdrawal requests</div>
          ) : [...(withdrawals ?? [])].reverse().map(w => (
            <div key={w.id} className="rounded-xl px-4 py-3 flex items-center justify-between gap-4"
              style={{ background: "#111827", border: `1px solid ${w.status === "pending" ? `${GOLD}25` : "rgba(255,255,255,0.06)"}` }}>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-sm">
                  {(w as any).user?.name} <span className="text-white/40 font-normal text-xs">({(w as any).user?.phone})</span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {w.method?.toUpperCase()} → {w.phone}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {new Date(w.createdAt!).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="font-black text-white">TZS {Number(w.amount).toLocaleString()}</div>
                  <StatusBadge status={w.status} />
                </div>
                {w.status === "pending" && (
                  <div className="flex gap-1.5">
                    <Approve onClick={() => handleApproveWd(w.id)} />
                    <Reject  onClick={() => handleRejectWd(w.id)} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── BETS ── */}
      {activeTab === "bets" && (
        <div className="space-y-2">
          <div className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
            All Bets · {bets?.length ?? 0} total
          </div>
          {betsLoading ? (
            [1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#111827" }} />)
          ) : bets?.length === 0 ? (
            <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.3)" }}>No bets yet</div>
          ) : [...(bets ?? [])].reverse().map(bet => (
            <div key={bet.id} className="rounded-xl px-4 py-3 flex items-center justify-between gap-4"
              style={{ background: "#111827", border: `1px solid ${bet.status === "pending" ? `${GOLD}20` : "rgba(255,255,255,0.06)"}` }}>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-sm">
                  {bet.user?.name} <span className="text-white/40 font-normal text-xs">({bet.user?.phone})</span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {bet.event?.teamHome} vs {bet.event?.teamAway} · <span style={{ color: GOLD }}>{bet.choice}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="font-black text-white text-sm">TZS {Number(bet.amount).toLocaleString()}</div>
                  <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Win: TZS {Number(bet.potentialWin).toLocaleString()}
                  </div>
                  <StatusBadge status={bet.status} />
                </div>
                {bet.status === "pending" && (
                  <div className="flex gap-1.5">
                    <button onClick={() => handleSettle(bet.id, "won")}
                      className="text-xs font-black px-3 py-1.5 rounded-lg"
                      style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}>
                      Won
                    </button>
                    <button onClick={() => handleSettle(bet.id, "lost")}
                      className="text-xs font-black px-3 py-1.5 rounded-lg"
                      style={{ background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)" }}>
                      Lost
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE EVENT ── */}
      {activeTab === "events" && (
        <form onSubmit={handleCreateEvent} className="rounded-2xl p-6 space-y-4 max-w-lg"
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="font-black text-white text-sm mb-1">Create Manual Event</div>
          {eventSuccess && <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>{eventSuccess}</div>}
          {eventError   && <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>{eventError}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Home Team</label>
              <input className={inp} style={inpSty} value={eventForm.teamHome} onChange={e => setEventForm(f => ({...f, teamHome: e.target.value}))} required placeholder="Simba SC" />
            </div>
            <div>
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Away Team</label>
              <input className={inp} style={inpSty} value={eventForm.teamAway} onChange={e => setEventForm(f => ({...f, teamAway: e.target.value}))} required placeholder="Young Africans" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">League</label>
            <input className={inp} style={inpSty} value={eventForm.league} onChange={e => setEventForm(f => ({...f, league: e.target.value}))} required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[["oddsHome","1 Home"],["oddsDraw","X Draw"],["oddsAway","2 Away"]] .map(([k,l]) => (
              <div key={k}>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">{l}</label>
                <input type="number" step="0.01" className={inp} style={inpSty}
                  value={(eventForm as any)[k]} onChange={e => setEventForm(f => ({...f, [k]: e.target.value}))} required />
              </div>
            ))}
          </div>
          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Kick-off time</label>
            <input type="datetime-local" className={inp} style={inpSty} value={eventForm.startsAt} onChange={e => setEventForm(f => ({...f, startsAt: e.target.value}))} />
          </div>
          <button type="submit" disabled={createEvent.isPending}
            className="w-full py-3 rounded-xl font-black text-sm text-black disabled:opacity-50"
            style={{ background: GOLD }}>
            {createEvent.isPending ? "Creating…" : "Create Event"}
          </button>
        </form>
      )}

      {/* ── USERS ── */}
      {activeTab === "users" && (
        <div>
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="text-xs font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
              {users?.length ?? 0} users
            </div>
            <div className="flex-1" />
            {!showAddUser && (
              <button onClick={() => setShowAddUser(true)}
                className="flex items-center gap-2 text-xs font-black px-4 py-2 rounded-xl transition-all"
                style={{ background: GOLD, color: "#000" }}>
                + Add User
              </button>
            )}
          </div>

          {/* Add user form */}
          {showAddUser && <AddUserForm onDone={() => setShowAddUser(false)} />}

          {/* User list */}
          {usersLoading ? (
            [1,2,3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse mb-2" style={{ background: "#111827" }} />)
          ) : users?.length === 0 ? (
            <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.3)" }}>No users</div>
          ) : users?.map(user => (
            <div key={user.id} className="rounded-xl mb-2 overflow-hidden"
              style={{ background: "#111827", border: editingUserId === user.id ? `1px solid ${GOLD}30` : "1px solid rgba(255,255,255,0.06)" }}>
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                {/* Avatar + info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-black text-sm"
                    style={{ background: user.isAdmin ? `${GOLD}20` : "rgba(255,255,255,0.07)", color: user.isAdmin ? GOLD : "rgba(255,255,255,0.5)" }}>
                    {user.isAdmin ? "👑" : user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-sm">{user.name}</span>
                      {user.isAdmin && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                          style={{ background: `${GOLD}20`, color: GOLD }}>ADMIN</span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {user.phone} · ID #{user.id}
                    </div>
                  </div>
                </div>

                {/* Balance + actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-black text-white">TZS {Number(user.balance).toLocaleString()}</div>
                    <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingUserId(editingUserId === user.id ? null : user.id)}
                    className="text-[10px] font-black px-3 py-1.5 rounded-lg transition-all"
                    style={{
                      background: editingUserId === user.id ? `${GOLD}20` : "rgba(255,255,255,0.07)",
                      color: editingUserId === user.id ? GOLD : "rgba(255,255,255,0.5)",
                      border: `1px solid ${editingUserId === user.id ? `${GOLD}40` : "rgba(255,255,255,0.1)"}`,
                    }}>
                    {editingUserId === user.id ? "✕ Close" : "✎ Balance"}
                  </button>
                </div>
              </div>

              {/* Balance editor */}
              {editingUserId === user.id && (
                <div className="px-4 pb-4">
                  <BalanceEditor
                    userId={user.id}
                    currentBalance={Number(user.balance)}
                    onDone={() => setEditingUserId(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
