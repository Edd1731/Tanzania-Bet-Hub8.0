import { useGetMyBets, getGetMyBetsQueryKey } from "@workspace/api-client-react";
import { useTranslation } from "@/hooks/use-translation";

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    won: "bg-green-500/15 text-green-400 border-green-500/30",
    lost: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  const label: Record<string, string> = {
    pending: t("pending"),
    won: t("won"),
    lost: t("lost"),
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${map[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {label[status] ?? status}
    </span>
  );
}

export default function MyBetsPage() {
  const { t } = useTranslation();
  const { data: bets, isLoading } = useGetMyBets({ query: { queryKey: getGetMyBetsQueryKey() } });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-black text-foreground mb-6">{t("my_bets")}</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-card rounded-xl animate-pulse border border-border" />)}
        </div>
      ) : bets?.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">{t("no_bets")}</div>
      ) : (
        <div className="space-y-3">
          {[...bets ?? []].reverse().map(bet => (
            <div key={bet.id} className="bg-card border border-border rounded-xl px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-foreground text-sm">
                    {bet.event?.teamHome ?? "?"} vs {bet.event?.teamAway ?? "?"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {bet.event?.league} &middot; {
                      bet.choice === "home" ? t("home") :
                      bet.choice === "draw" ? t("draw") : t("away")
                    } @ {(bet.event ? (
                      bet.choice === "home" ? bet.event.oddsHome :
                      bet.choice === "draw" ? bet.event.oddsDraw : bet.event.oddsAway
                    ) : 0).toFixed(2)}
                  </div>
                </div>
                <StatusBadge status={bet.status} />
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">{t("amount")}</span>
                  <span className="font-bold text-foreground">TZS {Number(bet.amount).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">{t("potential_win")}</span>
                  <span className={`font-bold ${bet.status === "won" ? "text-green-400" : "text-foreground"}`}>
                    TZS {Number(bet.potentialWin).toLocaleString()}
                  </span>
                </div>
                <div className="ml-auto text-xs text-muted-foreground">
                  {bet.createdAt ? new Date(bet.createdAt).toLocaleDateString() : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
