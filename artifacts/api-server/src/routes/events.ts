import { Router, type IRouter } from "express";
import { db, eventsTable } from "@workspace/db";
import { eq, or, inArray } from "drizzle-orm";

const router: IRouter = Router();

export function serializeEvent(event: typeof eventsTable.$inferSelect) {
  const pn = (v: string | null | undefined) => v ? parseFloat(v) : undefined;
  return {
    id:          event.id,
    matchId:     event.matchId,
    teamHome:    event.teamHome,
    teamAway:    event.teamAway,
    league:      event.league,
    country:     event.country     ?? undefined,
    logoHome:    event.logoHome    ?? undefined,
    logoAway:    event.logoAway    ?? undefined,
    leagueLogo:  event.leagueLogo  ?? undefined,
    oddsHome:    parseFloat(event.oddsHome),
    oddsDraw:    parseFloat(event.oddsDraw),
    oddsAway:    parseFloat(event.oddsAway),
    oddsO15:     pn(event.oddsO15),
    oddsU15:     pn(event.oddsU15),
    oddsO25:     pn(event.oddsO25),
    oddsU25:     pn(event.oddsU25),
    oddsO35:     pn(event.oddsO35),
    oddsU35:     pn(event.oddsU35),
    oddsBttsY:   pn(event.oddsBttsY),
    oddsBttsN:   pn(event.oddsBttsN),
    scoreHome:   event.scoreHome   ?? null,
    scoreAway:   event.scoreAway   ?? null,
    elapsed:     event.elapsed     ?? null,
    statusShort: event.statusShort ?? "NS",
    status:      event.status,
    startsAt:    event.startsAt,
    createdAt:   event.createdAt,
  };
}

// Returns active + in-progress fixtures (bettable and live)
router.get("/events", async (req, res): Promise<void> => {
  const events = await db
    .select()
    .from(eventsTable)
    .where(
      inArray(eventsTable.status, ["active", "finished"])
    )
    .orderBy(eventsTable.startsAt);
  res.json(events.map(serializeEvent));
});

export default router;
