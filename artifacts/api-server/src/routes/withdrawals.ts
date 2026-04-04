import { Router, type IRouter } from "express";
import { db, usersTable, withdrawalsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function serializeWithdrawal(w: typeof withdrawalsTable.$inferSelect, user?: typeof usersTable.$inferSelect) {
  return {
    id: w.id,
    userId: w.userId,
    amount: parseFloat(w.amount),
    phone: w.phone,
    method: w.method,
    status: w.status,
    note: w.note ?? null,
    createdAt: w.createdAt,
    ...(user ? {
      user: {
        id: user.id, name: user.name, phone: user.phone,
        balance: parseFloat(user.balance), isAdmin: user.isAdmin,
      },
    } : {}),
  };
}

router.post("/withdrawals", requireAuth, async (req, res): Promise<void> => {
  const { amount, phone, method } = req.body;
  const userId = req.authUser!.id;

  if (!amount || isNaN(Number(amount)) || Number(amount) < 1000) {
    res.status(400).json({ message: "Minimum withdrawal is TZS 1,000" });
    return;
  }
  if (!phone || typeof phone !== "string" || phone.trim().length < 9) {
    res.status(400).json({ message: "Valid phone number required" });
    return;
  }
  const validMethods = ["mpesa", "tigopesa", "halopesa", "airtel"];
  if (!validMethods.includes(method)) {
    res.status(400).json({ message: "Invalid withdrawal method" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ message: "User not found" }); return; }

  if (parseFloat(user.balance) < Number(amount)) {
    res.status(400).json({ message: "Insufficient balance" });
    return;
  }

  const newBalance = parseFloat(user.balance) - Number(amount);
  await db.update(usersTable).set({ balance: String(newBalance) }).where(eq(usersTable.id, userId));

  const [w] = await db.insert(withdrawalsTable).values({
    userId,
    amount: String(amount),
    phone: phone.trim(),
    method,
    status: "pending",
  }).returning();

  res.status(201).json(serializeWithdrawal(w));
});

router.get("/withdrawals", requireAuth, async (req, res): Promise<void> => {
  const userId = req.authUser!.id;
  const rows = await db.select().from(withdrawalsTable)
    .where(eq(withdrawalsTable.userId, userId))
    .orderBy(withdrawalsTable.createdAt);
  res.json(rows.map(w => serializeWithdrawal(w)));
});

export { serializeWithdrawal };
export default router;
