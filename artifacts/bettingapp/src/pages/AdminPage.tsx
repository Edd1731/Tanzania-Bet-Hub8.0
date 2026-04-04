import { useState } from "react";
import {
  useAdminGetStats, useAdminGetTransactions, useAdminApproveTransaction, useAdminRejectTransaction,
  useAdminGetBets, useAdminSettleBet, useAdminCreateEvent, useAdminGetUsers,
  getAdminGetTransactionsQueryKey, getAdminGetBetsQueryKey, getAdminGetStatsQueryKey, getAdminGetUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks/use-translation";

type Tab = "stats" | "deposits" | "bets" | "events" | "users";

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-4">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-black text-foreground">{value}</div>
    </div>
  );
}

export default function AdminPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("stats");

  const { data: stats } = useAdminGetStats({ query: { queryKey: getAdminGetStatsQueryKey() } });
  const { data: transactions, isLoading: txLoading } = useAdminGetTransactions({ query: { queryKey: getAdminGetTransactionsQueryKey(), enabled: activeTab === "deposits" } });
  const { data: bets, isLoading: betsLoading } = useAdminGetBets({ query: { queryKey: getAdminGetBetsQueryKey(), enabled: activeTab === "bets" } });
  const { data: users, isLoading: usersLoading } = useAdminGetUsers({ query: { queryKey: getAdminGetUsersQueryKey(), enabled: activeTab === "users" } });

  const approveTx = useAdminApproveTransaction();
  const rejectTx = useAdminRejectTransaction();
  const settleBet = useAdminSettleBet();
  const createEvent = useAdminCreateEvent();

  const [eventForm, setEventForm] = useState({
    teamHome: "", teamAway: "", league: "NBC Premier League",
    oddsHome: "2.0", oddsDraw: "3.0", oddsAway: "2.5", startsAt: "",
  });
  const [eventSuccess, setEventSuccess] = useState("");
  const [eventError, setEventError] = useState("");

  const handleApprove = async (id: number) => {
    await approveTx.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getAdminGetTransactionsQueryKey() });
    qc.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
  };

  const handleReject = async (id: number) => {
    await rejectTx.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getAdminGetTransactionsQueryKey() });
    qc.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
  };

  const handleSettle = async (id: number, outcome: "won" | "lost") => {
    await settleBet.mutateAsync({ id, data: { outcome } });
    qc.invalidateQueries({ queryKey: getAdminGetBetsQueryKey() });
    qc.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventError(""); setEventSuccess("");
    try {
      await createEvent.mutateAsync({ data: {
        teamHome: eventForm.teamHome, teamAway: eventForm.teamAway,
        league: eventForm.league,
        oddsHome: parseFloat(eventForm.oddsHome),
        oddsDraw: parseFloat(eventForm.oddsDraw),
        oddsAway: parseFloat(eventForm.oddsAway),
        startsAt: eventForm.startsAt || undefined,
      } });
      setEventSuccess("Event created!");
      setEventForm({ teamHome: "", teamAway: "", league: "NBC Premier League", oddsHome: "2.0", oddsDraw: "3.0", oddsAway: "2.5", startsAt: "" });
    } catch (err: any) {
      setEventError(err?.data?.message || err?.message || "Error");
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "stats", label: t("stats") },
    { key: "deposits", label: t("deposits") + (stats?.pendingDeposits ? ` (${stats.pendingDeposits})` : "") },
    { key: "bets", label: t("bets") },
    { key: "events", label: t("create_event") },
    { key: "users", label: t("users") },
  ];

  const statusColor = (s: string) => ({
    pending: "text-yellow-400",
    approved: "text-green-400",
    rejected: "text-red-400",
    won: "text-green-400",
    lost: "text-red-400",
  }[s] ?? "text-muted-foreground");

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-2 h-8 bg-primary rounded-full" />
        <h1 className="text-2xl font-black text-foreground">{t("admin")}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {activeTab === "stats" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatBox label={t("total_users")} value={stats?.totalUsers ?? 0} />
          <StatBox label={t("total_bets")} value={stats?.totalBets ?? 0} />
          <StatBox label={t("active_bets")} value={stats?.activeBets ?? 0} />
          <StatBox label="Pending Deposits" value={stats?.pendingDeposits ?? 0} />
          <StatBox label={t("total_deposited")} value={`TZS ${Number(stats?.totalDeposited ?? 0).toLocaleString()}`} />
          <StatBox label={t("total_paid_out")} value={`TZS ${Number(stats?.totalPaidOut ?? 0).toLocaleString()}`} />
        </div>
      )}

      {/* Deposits */}
      {activeTab === "deposits" && (
        <div className="space-y-3">
          {txLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-card rounded-xl animate-pulse border border-border" />)}</div>
          ) : transactions?.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">{t("no_deposits")}</p>
          ) : [...(transactions ?? [])].reverse().map(tx => (
            <div key={tx.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-foreground text-sm">
                  {tx.user?.name} <span className="text-muted-foreground font-normal text-xs">({tx.user?.phone})</span>
                </div>
                <div className="text-xs text-muted-foreground">{tx.method} &middot; {tx.txId}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-black text-foreground">TZS {Number(tx.amount).toLocaleString()}</div>
                  <div className={`text-xs font-bold ${statusColor(tx.status)}`}>{tx.status}</div>
                </div>
                {tx.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(tx.id)}
                      className="text-xs px-3 py-1.5 bg-green-500/15 text-green-400 rounded-lg hover:bg-green-500/25 font-bold"
                    >
                      {t("approve")}
                    </button>
                    <button
                      onClick={() => handleReject(tx.id)}
                      className="text-xs px-3 py-1.5 bg-red-500/15 text-red-400 rounded-lg hover:bg-red-500/25 font-bold"
                    >
                      {t("reject")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bets */}
      {activeTab === "bets" && (
        <div className="space-y-3">
          {betsLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-card rounded-xl animate-pulse border border-border" />)}</div>
          ) : bets?.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">{t("no_bets")}</p>
          ) : [...(bets ?? [])].reverse().map(bet => (
            <div key={bet.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-foreground text-sm">
                  {bet.user?.name} <span className="text-muted-foreground font-normal text-xs">({bet.user?.phone})</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {bet.event?.teamHome} vs {bet.event?.teamAway} &middot; {
                    bet.choice === "home" ? t("home") : bet.choice === "draw" ? t("draw") : t("away")
                  }
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-black text-foreground text-sm">TZS {Number(bet.amount).toLocaleString()}</div>
                  <div className={`text-xs font-bold ${statusColor(bet.status)}`}>{bet.status}</div>
                </div>
                {bet.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleSettle(bet.id, "won")} className="text-xs px-3 py-1.5 bg-green-500/15 text-green-400 rounded-lg hover:bg-green-500/25 font-bold">
                      {t("won")}
                    </button>
                    <button onClick={() => handleSettle(bet.id, "lost")} className="text-xs px-3 py-1.5 bg-red-500/15 text-red-400 rounded-lg hover:bg-red-500/25 font-bold">
                      {t("lost")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Event */}
      {activeTab === "events" && (
        <form onSubmit={handleCreateEvent} className="bg-card border border-border rounded-2xl p-6 space-y-4 max-w-lg">
          {eventSuccess && <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg px-3 py-2">{eventSuccess}</div>}
          {eventError && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-3 py-2">{eventError}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">{t("team_home")}</label>
              <input value={eventForm.teamHome} onChange={e => setEventForm(f => ({...f, teamHome: e.target.value}))}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" required placeholder="Simba SC" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">{t("team_away")}</label>
              <input value={eventForm.teamAway} onChange={e => setEventForm(f => ({...f, teamAway: e.target.value}))}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" required placeholder="Young Africans" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">{t("league")}</label>
            <input value={eventForm.league} onChange={e => setEventForm(f => ({...f, league: e.target.value}))}
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" required />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">{t("odds_home")}</label>
              <input type="number" step="0.01" value={eventForm.oddsHome} onChange={e => setEventForm(f => ({...f, oddsHome: e.target.value}))}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">{t("odds_draw")}</label>
              <input type="number" step="0.01" value={eventForm.oddsDraw} onChange={e => setEventForm(f => ({...f, oddsDraw: e.target.value}))}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">{t("odds_away")}</label>
              <input type="number" step="0.01" value={eventForm.oddsAway} onChange={e => setEventForm(f => ({...f, oddsAway: e.target.value}))}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>
          </div>

          <button type="submit" disabled={createEvent.isPending}
            className="w-full bg-primary text-primary-foreground font-black py-3 rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
            {createEvent.isPending ? "..." : t("create_event")}
          </button>
        </form>
      )}

      {/* Users */}
      {activeTab === "users" && (
        <div className="space-y-2">
          {usersLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-card rounded-xl animate-pulse border border-border" />)}</div>
          ) : users?.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No users</p>
          ) : users?.map(user => (
            <div key={user.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-bold text-foreground text-sm">{user.name} {user.isAdmin && <span className="text-xs bg-primary/15 text-primary rounded px-1.5 py-0.5 ml-1">Admin</span>}</div>
                <div className="text-xs text-muted-foreground">{user.phone}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-foreground text-sm">TZS {Number(user.balance).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ""}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
