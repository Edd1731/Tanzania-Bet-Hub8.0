import { Router, type IRouter } from "express";
import { db, usersTable, betsTable, transactionsTable } from "@workspace/db";
import { eq, sum, count, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

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

router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.authUser!.id));
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }
  res.json(serializeUser(user));
});

router.get("/stats/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = req.authUser!.id;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const allBets = await db.select().from(betsTable).where(eq(betsTable.userId, userId));

  const totalBets = allBets.length;
  const wonBets = allBets.filter(b => b.status === "won").length;
  const lostBets = allBets.filter(b => b.status === "lost").length;
  const pendingBets = allBets.filter(b => b.status === "pending").length;
  const totalWagered = allBets.reduce((acc, b) => acc + parseFloat(b.amount), 0);
  const totalWon = allBets.filter(b => b.status === "won").reduce((acc, b) => acc + parseFloat(b.potentialWin), 0);

  res.json({
    totalBets,
    wonBets,
    lostBets,
    pendingBets,
    totalWagered,
    totalWon,
    balance: parseFloat(user?.balance ?? "0"),
  });
});

export default router;
