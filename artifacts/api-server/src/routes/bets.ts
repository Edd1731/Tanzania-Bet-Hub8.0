import { Router, type IRouter } from "express";
import { db, betsTable, eventsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { PlaceBetBody } from "@workspace/api-zod";

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

function serializeBet(bet: typeof betsTable.$inferSelect, event?: typeof eventsTable.$inferSelect) {
  return {
    id: bet.id,
    userId: bet.userId,
    eventId: bet.eventId,
    choice: bet.choice,
    amount: parseFloat(bet.amount),
    potentialWin: parseFloat(bet.potentialWin),
    status: bet.status,
    createdAt: bet.createdAt,
    ...(event ? { event: serializeEvent(event) } : {}),
  };
}

router.post("/bets", requireAuth, async (req, res): Promise<void> => {
  const parsed = PlaceBetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const { eventId, choice, amount } = parsed.data;
  const userId = req.authUser!.id;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const currentBalance = parseFloat(user.balance);
  if (currentBalance < amount) {
    res.status(400).json({ message: "Insufficient balance" });
    return;
  }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
  if (!event || event.status !== "active") {
    res.status(400).json({ message: "Event not available" });
    return;
  }

  let odds = 1;
  if (choice === "home") odds = parseFloat(event.oddsHome);
  else if (choice === "draw") odds = parseFloat(event.oddsDraw);
  else if (choice === "away") odds = parseFloat(event.oddsAway);

  const potentialWin = amount * odds;

  await db.update(usersTable)
    .set({ balance: String(currentBalance - amount) })
    .where(eq(usersTable.id, userId));

  const [bet] = await db.insert(betsTable).values({
    userId,
    eventId,
    choice,
    amount: String(amount),
    potentialWin: String(potentialWin),
    status: "pending",
  }).returning();

  res.status(201).json(serializeBet(bet, event));
});

router.get("/bets", requireAuth, async (req, res): Promise<void> => {
  const userId = req.authUser!.id;

  const bets = await db.select().from(betsTable).where(eq(betsTable.userId, userId)).orderBy(betsTable.createdAt);

  const betsWithEvents = await Promise.all(
    bets.map(async (bet) => {
      const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, bet.eventId));
      return serializeBet(bet, event);
    })
  );

  res.json(betsWithEvents);
});

export default router;
