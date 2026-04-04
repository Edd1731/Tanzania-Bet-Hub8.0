import { Router, type IRouter } from "express";
import { db, usersTable, betsTable, eventsTable, transactionsTable } from "@workspace/db";
import { eq, count, sum } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { AdminSettleBetBody, AdminCreateEventBody } from "@workspace/api-zod";

const router: IRouter = Router();

function serializeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    balance: parseFloat(user.balance),
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
  };
}

function serializeTx(tx: typeof transactionsTable.$inferSelect, user?: typeof usersTable.$inferSelect) {
  return {
    id: tx.id,
    userId: tx.userId,
    amount: parseFloat(tx.amount),
    txId: tx.txId,
    method: tx.method,
    status: tx.status,
    createdAt: tx.createdAt,
    ...(user ? { user: serializeUser(user) } : {}),
  };
}

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

function serializeBet(bet: typeof betsTable.$inferSelect, user?: typeof usersTable.$inferSelect, event?: typeof eventsTable.$inferSelect) {
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
    ...(user ? { user: serializeUser(user) } : {}),
  };
}

router.get("/admin/transactions", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const txs = await db.select().from(transactionsTable).orderBy(transactionsTable.createdAt);
  const withUsers = await Promise.all(txs.map(async (tx) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
    return serializeTx(tx, user);
  }));
  res.json(withUsers);
});

router.post("/admin/transactions/:id/approve", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [tx] = await db.update(transactionsTable)
    .set({ status: "approved" })
    .where(eq(transactionsTable.id, id))
    .returning();

  if (!tx) {
    res.status(404).json({ message: "Transaction not found" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
  if (user) {
    const newBalance = parseFloat(user.balance) + parseFloat(tx.amount);
    await db.update(usersTable).set({ balance: String(newBalance) }).where(eq(usersTable.id, user.id));
  }

  res.json(serializeTx(tx));
});

router.post("/admin/transactions/:id/reject", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [tx] = await db.update(transactionsTable)
    .set({ status: "rejected" })
    .where(eq(transactionsTable.id, id))
    .returning();

  if (!tx) {
    res.status(404).json({ message: "Transaction not found" });
    return;
  }

  res.json(serializeTx(tx));
});

router.get("/admin/bets", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const bets = await db.select().from(betsTable).orderBy(betsTable.createdAt);
  const withDetails = await Promise.all(bets.map(async (bet) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, bet.userId));
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, bet.eventId));
    return serializeBet(bet, user, event);
  }));
  res.json(withDetails);
});

router.post("/admin/bets/:id/settle", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = AdminSettleBetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const { outcome } = parsed.data;

  const [bet] = await db.update(betsTable)
    .set({ status: outcome })
    .where(eq(betsTable.id, id))
    .returning();

  if (!bet) {
    res.status(404).json({ message: "Bet not found" });
    return;
  }

  if (outcome === "won") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, bet.userId));
    if (user) {
      const newBalance = parseFloat(user.balance) + parseFloat(bet.potentialWin);
      await db.update(usersTable).set({ balance: String(newBalance) }).where(eq(usersTable.id, user.id));
    }
  }

  res.json(serializeBet(bet));
});

router.post("/admin/events", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminCreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const { teamHome, teamAway, league, oddsHome, oddsDraw, oddsAway, startsAt } = parsed.data;
  const matchId = `${teamHome}-${teamAway}-${Date.now()}`.toLowerCase().replace(/\s+/g, "-");

  const [event] = await db.insert(eventsTable).values({
    matchId,
    teamHome,
    teamAway,
    league,
    oddsHome: String(oddsHome),
    oddsDraw: String(oddsDraw),
    oddsAway: String(oddsAway),
    status: "active",
    startsAt: startsAt ? new Date(startsAt) : null,
  }).returning();

  res.status(201).json(serializeEvent(event));
});

router.get("/admin/users", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(users.map(serializeUser));
});

router.get("/admin/stats", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const allUsers = await db.select().from(usersTable);
  const allBets = await db.select().from(betsTable);
  const allTxs = await db.select().from(transactionsTable);

  const totalUsers = allUsers.length;
  const totalBets = allBets.length;
  const pendingDeposits = allTxs.filter(t => t.status === "pending").length;
  const totalDeposited = allTxs.filter(t => t.status === "approved").reduce((acc, t) => acc + parseFloat(t.amount), 0);
  const totalPaidOut = allBets.filter(b => b.status === "won").reduce((acc, b) => acc + parseFloat(b.potentialWin), 0);
  const activeBets = allBets.filter(b => b.status === "pending").length;

  res.json({ totalUsers, totalBets, pendingDeposits, totalDeposited, totalPaidOut, activeBets });
});

export default router;
