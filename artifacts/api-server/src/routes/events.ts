import { Router, type IRouter } from "express";
import { db, eventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function serializeEvent(event: typeof eventsTable.$inferSelect) {
  return {
    id: event.id,
    matchId: event.matchId,
    teamHome: event.teamHome,
    teamAway: event.teamAway,
    league: event.league,
    oddsHome: parseFloat(event.oddsHome),
    oddsDraw: parseFloat(event.oddsDraw),
    oddsAway: parseFloat(event.oddsAway),
    status: event.status,
    startsAt: event.startsAt,
    createdAt: event.createdAt,
  };
}

router.get("/events", async (req, res): Promise<void> => {
  const events = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.status, "active"))
    .orderBy(eventsTable.createdAt);
  res.json(events.map(serializeEvent));
});

export default router;
