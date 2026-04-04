import { Router, type IRouter } from "express";
import { db, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateDepositBody } from "@workspace/api-zod";

const router: IRouter = Router();

function serializeTx(tx: typeof transactionsTable.$inferSelect) {
  return {
    id: tx.id,
    userId: tx.userId,
    amount: parseFloat(tx.amount),
    txId: tx.txId,
    method: tx.method,
    status: tx.status,
    createdAt: tx.createdAt,
  };
}

router.post("/deposits", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateDepositBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const { amount, txId, method } = parsed.data;
  const userId = req.authUser!.id;

  const [tx] = await db.insert(transactionsTable).values({
    userId,
    amount: String(amount),
    txId,
    method,
    status: "pending",
  }).returning();

  res.status(201).json(serializeTx(tx));
});

router.get("/deposits", requireAuth, async (req, res): Promise<void> => {
  const userId = req.authUser!.id;
  const txs = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(transactionsTable.createdAt);
  res.json(txs.map(serializeTx));
});

export default router;
