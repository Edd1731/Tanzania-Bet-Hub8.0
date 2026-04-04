import { useState } from "react";
import { useGetEvents, usePlaceBet } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/use-translation";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetEventsQueryKey, getGetStatsSummaryQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";

type BetItem = {
  eventId: number;
  teamHome: string;
  teamAway: string;
  choice: "home" | "draw" | "away";
  odds: number;
  amount: string;
};

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: events, isLoading } = useGetEvents();
  const placeBet = usePlaceBet();

  const [betSlip, setBetSlip] = useState<BetItem[]>([]);
  const [placingBet, setPlacingBet] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const addToBetSlip = (
    eventId: number, teamHome: string, teamAway: string,
    choice: "home" | "draw" | "away", odds: number
  ) => {
    setBetSlip(prev => {
      const existing = prev.findIndex(b => b.eventId === eventId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { eventId, teamHome, teamAway, choice, odds, amount: updated[existing].amount };
        return updated;
      }
      return [...prev, { eventId, teamHome, teamAway, choice, odds, amount: "1000" }];
    });
    setSuccessMsg("");
    setErrorMsg("");
  };

  const removeFromSlip = (eventId: number) => {
    setBetSlip(prev => prev.filter(b => b.eventId !== eventId));
  };

  const updateAmount = (eventId: number, amount: string) => {
    setBetSlip(prev => prev.map(b => b.eventId === eventId ? { ...b, amount } : b));
  };

  const totalStake = betSlip.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);

  const handlePlaceAll = async () => {
    if (!user) { navigate("/login"); return; }
    if (betSlip.length === 0) return;
    setPlacingBet(true);
    setErrorMsg("");
    try {
      for (const bet of betSlip) {
        const amt = parseFloat(bet.amount);
        if (isNaN(amt) || amt <= 0) throw new Error("Invalid amount");
        await placeBet.mutateAsync({ data: { eventId: bet.eventId, choice: bet.choice, amount: amt } });
      }
      setBetSlip([]);
      setSuccessMsg(t("my_bets") + " - " + t("pending"));
      qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      qc.invalidateQueries({ queryKey: getGetStatsSummaryQueryKey() });
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err?.message || "Error placing bet");
    }
    setPlacingBet(false);
  };

  const choiceLabel = (choice: "home" | "draw" | "away") => {
    if (choice === "home") return t("home");
    if (choice === "draw") return t("draw");
    return t("away");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex gap-6">
        {/* Events List */}
        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <h1 className="text-2xl font-black text-foreground">{t("events")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">NBC Premier League & International</p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-24 bg-card rounded-xl animate-pulse border border-border" />
              ))}
            </div>
          ) : events?.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">{t("no_events")}</div>
          ) : (
            <div className="space-y-3">
              {events?.map(event => {
                const inSlip = betSlip.find(b => b.eventId === event.id);
                return (
                  <div key={event.id} className={`rounded-xl border transition-all duration-200 overflow-hidden ${inSlip ? "border-primary/60 bg-primary/5" : "border-border bg-card hover:border-border/80"}`}>
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-primary uppercase tracking-wide">{event.league}</span>
                        <span className="text-xs text-muted-foreground">{event.status}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 text-center">
                          <div className="font-bold text-foreground text-sm sm:text-base">{event.teamHome}</div>
                        </div>
                        <div className="text-xs font-bold text-muted-foreground px-2">VS</div>
                        <div className="flex-1 text-center">
                          <div className="font-bold text-foreground text-sm sm:text-base">{event.teamAway}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {([
                          { key: "home" as const, label: t("home"), odds: event.oddsHome },
                          { key: "draw" as const, label: t("draw"), odds: event.oddsDraw },
                          { key: "away" as const, label: t("away"), odds: event.oddsAway },
                        ]).map(opt => (
                          <button
                            key={opt.key}
                            onClick={() => addToBetSlip(event.id, event.teamHome, event.teamAway, opt.key, opt.odds)}
                            className={`rounded-lg py-2 px-3 text-center transition-all duration-150 border ${
                              inSlip?.choice === opt.key
                                ? "bg-primary text-primary-foreground border-primary font-bold"
                                : "bg-muted border-border text-foreground hover:border-primary hover:bg-accent"
                            }`}
                          >
                            <div className="text-[10px] text-muted-foreground mb-0.5">{opt.label}</div>
                            <div className="text-base font-black">{opt.odds.toFixed(2)}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bet Slip */}
        <div className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-20 bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-primary/10 border-b border-border">
              <h2 className="font-black text-foreground text-sm">{t("bet_slip")} {betSlip.length > 0 && <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs ml-1">{betSlip.length}</span>}</h2>
            </div>
            {betSlip.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">{t("empty_slip")}</div>
            ) : (
              <div>
                <div className="max-h-80 overflow-y-auto">
                  {betSlip.map(bet => (
                    <div key={bet.eventId} className="px-4 py-3 border-b border-border/50">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">{bet.teamHome} v {bet.teamAway}</div>
                          <div className="text-xs text-primary font-bold">{choiceLabel(bet.choice)} @ {bet.odds.toFixed(2)}</div>
                        </div>
                        <button onClick={() => removeFromSlip(bet.eventId)} className="text-muted-foreground hover:text-destructive text-xs shrink-0">X</button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground shrink-0">TZS</span>
                        <input
                          type="number"
                          value={bet.amount}
                          onChange={e => updateAmount(bet.eventId, e.target.value)}
                          className="flex-1 bg-background border border-input rounded px-2 py-1 text-sm text-foreground w-0"
                          min="100"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t("potential_win")}: <span className="text-primary font-bold">TZS {((parseFloat(bet.amount) || 0) * bet.odds).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3">
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-muted-foreground">{t("total_stake")}</span>
                    <span className="font-bold text-foreground">TZS {totalStake.toLocaleString()}</span>
                  </div>
                  {successMsg && <div className="mb-2 text-xs text-green-400 bg-green-400/10 rounded px-2 py-1">{successMsg}</div>}
                  {errorMsg && <div className="mb-2 text-xs text-destructive bg-destructive/10 rounded px-2 py-1">{errorMsg}</div>}
                  <button
                    onClick={handlePlaceAll}
                    disabled={placingBet}
                    className="w-full bg-primary text-primary-foreground font-black py-2.5 rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {placingBet ? "..." : t("place_bet")}
                  </button>
                  {!user && (
                    <p className="text-xs text-center text-muted-foreground mt-2">{t("login")} / {t("register")}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bet slip */}
      {betSlip.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold">{t("bet_slip")} ({betSlip.length})</span>
            <span className="text-sm text-muted-foreground">TZS {totalStake.toLocaleString()}</span>
          </div>
          {errorMsg && <div className="mb-2 text-xs text-destructive">{errorMsg}</div>}
          <button
            onClick={handlePlaceAll}
            disabled={placingBet}
            className="w-full bg-primary text-primary-foreground font-black py-2.5 rounded-lg text-sm"
          >
            {placingBet ? "..." : t("place_bet")}
          </button>
        </div>
      )}
    </div>
  );
}
