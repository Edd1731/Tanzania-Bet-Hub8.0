import { useGetStatsSummary, useGetMe, getGetStatsSummaryQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/use-translation";
import { Link } from "wouter";

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`bg-card border rounded-xl px-4 py-4 ${highlight ? "border-primary/40" : "border-border"}`}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-xl font-black ${highlight ? "text-primary" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { data: stats, isLoading: statsLoading } = useGetStatsSummary({ query: { queryKey: getGetStatsSummaryQueryKey() } });
  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });

  const winRate = stats && stats.totalBets > 0
    ? Math.round((stats.wonBets / stats.totalBets) * 100)
    : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* User header */}
      <div className="bg-card border border-border rounded-2xl px-6 py-5 mb-6 flex items-center gap-4">
        <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-black text-xl">
            {me?.name?.[0]?.toUpperCase() ?? "U"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-lg text-foreground truncate">{me?.name ?? user?.name}</div>
          <div className="text-sm text-muted-foreground">{me?.phone ?? user?.phone}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">{t("balance")}</div>
          <div className="text-xl font-black text-primary">
            TZS {Number(me?.balance ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">{t("stats")}</h2>
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-20 bg-card rounded-xl animate-pulse border border-border" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <StatCard label={t("total_bets")} value={stats?.totalBets ?? 0} />
          <StatCard label={t("won_bets")} value={stats?.wonBets ?? 0} highlight />
          <StatCard label={t("lost_bets")} value={stats?.lostBets ?? 0} />
          <StatCard label={t("pending_bets")} value={stats?.pendingBets ?? 0} />
          <StatCard label={t("total_wagered")} value={`TZS ${Number(stats?.totalWagered ?? 0).toLocaleString()}`} />
          <StatCard label={t("total_won")} value={`TZS ${Number(stats?.totalWon ?? 0).toLocaleString()}`} highlight />
        </div>
      )}

      {stats && stats.totalBets > 0 && (
        <div className="bg-card border border-border rounded-xl px-5 py-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Win Rate</span>
            <span className="text-sm font-black text-primary">{winRate}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${winRate}%` }} />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/deposit" className="flex-1 text-center bg-primary text-primary-foreground font-bold py-3 rounded-xl text-sm hover:bg-primary/90 transition-colors">
          {t("deposit")}
        </Link>
        <button
          onClick={logout}
          className="flex-1 bg-destructive/10 text-destructive font-bold py-3 rounded-xl text-sm hover:bg-destructive/20 transition-colors"
        >
          {t("logout")}
        </button>
      </div>
    </div>
  );
}
