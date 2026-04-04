import { Router, type IRouter } from "express";
import { db, betsTable, eventsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { PlaceBetBody } from "@workspace/api-zod";
import { serializeEvent } from "./events";

const router: IRouter = Router();

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

/** Compute Double Chance odds from 1X2 implied probabilities. */
function dcOdds(o1: number, o2: number, margin = 0.95): number {
  const p1 = 1 / o1;
  const p2 = 1 / o2;
  const totalImplied = p1 + p2;
  return Math.round((1 / totalImplied) * margin * 100) / 100;
}

function resolveOdds(choice: string, event: typeof eventsTable.$inferSelect): number | null {
  const H = parseFloat(event.oddsHome);
  const D = parseFloat(event.oddsDraw);
  const A = parseFloat(event.oddsAway);
  const pn = (v: string | null | undefined) => v ? parseFloat(v) : null;

  switch (choice) {
    // 1X2
    case "home":    return H;
    case "draw":    return D;
    case "away":    return A;
    // Double Chance (computed from 1X2)
    case "dc_1x":   return dcOdds(H, D);
    case "dc_x2":   return dcOdds(D, A);
    case "dc_12":   return dcOdds(H, A);
    // Over/Under
    case "ou_o15":  return pn(event.oddsO15);
    case "ou_u15":  return pn(event.oddsU15);
    case "ou_o25":  return pn(event.oddsO25);
    case "ou_u25":  return pn(event.oddsU25);
    case "ou_o35":  return pn(event.oddsO35);
    case "ou_u35":  return pn(event.oddsU35);
    // BTTS
    case "btts_yes": return pn(event.oddsBttsY);
    case "btts_no":  return pn(event.oddsBttsN);
    default: return null;
  }
}

router.post("/bets", requireAuth, async (req, res): Promise<void> => {
  const parsed = PlaceBetBody.safeParse(req.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    res.status(400).json({ message: firstIssue ? `${firstIssue.path.join(".")}: ${firstIssue.message}` : "Invalid request" });
    return;
  }

  const { eventId, choice, amount } = parsed.data;
  const userId = req.authUser!.id;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ message: "User not found" }); return; }

  const currentBalance = parseFloat(user.balance);
  if (currentBalance < amount) { res.status(400).json({ message: "Insufficient balance" }); return; }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
  if (!event || event.status !== "active") { res.status(400).json({ message: "Event not available" }); return; }

  const odds = resolveOdds(choice, event);
  if (!odds) { res.status(400).json({ message: "Invalid market choice" }); return; }

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
