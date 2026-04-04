import { Router, type IRouter } from "express";
import { db, transactionsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateDepositBody } from "@workspace/api-zod";

const router: IRouter = Router();

// ─── Tanzania Mobile Money txId validation ───────────────────────────────────
// These patterns cover real Vodacom M-Pesa TZ, TigoPesa, HaloPesa, and Airtel
// transaction reference formats. They are used for semi-automatic verification.
const TX_PATTERNS: { method: RegExp[]; pattern: RegExp }[] = [
  {
    // Vodacom M-Pesa Tanzania: 2-3 uppercase letters + 7-12 digits
    // e.g. RO18345678, HXY12345678, SL12345678, MP12345678, NK5678123456
    method: [/mpesa/i],
    pattern: /^[A-Z]{2,4}[0-9]{7,12}$/,
  },
  {
    // TigoPesa Tanzania: T + 8-10 digits, or SA/SAP + digits
    method: [/tigo/i],
    pattern: /^(T[0-9]{8,10}|SA[A-Z0-9]{5,12})$/,
  },
  {
    // HaloPesa (Zantel/TTCL): H + digits or HZ + digits
    method: [/halo/i],
    pattern: /^H[A-Z]?[0-9]{7,12}$/,
  },
  {
    // Airtel Money Tanzania: AI/AIT/A + digits
    method: [/airtel/i],
    pattern: /^A(I|IT)?[0-9]{7,12}$/,
  },
];

// Generic fallback: any uppercase alphanumeric 6-20 chars
const GENERIC_TX_PATTERN = /^[A-Z0-9]{6,20}$/;

function isValidTxId(txId: string, method: string): boolean {
  const upper = txId.toUpperCase().trim();
  // Check carrier-specific pattern first
  for (const { method: methodPatterns, pattern } of TX_PATTERNS) {
    if (methodPatterns.some(mp => mp.test(method))) {
      return pattern.test(upper);
    }
  }
  // Generic check — still needs to look like a proper reference
  return GENERIC_TX_PATTERN.test(upper);
}

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

// ─── POST /deposits ───────────────────────────────────────────────────────────
router.post("/deposits", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateDepositBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }

  const { amount, txId, method } = parsed.data;
  const userId = req.authUser!.id;

  // 1️⃣  Reject if amount is below minimum
  if (amount < 500) {
    res.status(400).json({ message: "Minimum deposit is TZS 500." });
    return;
  }

  // 2️⃣  Check for duplicate transaction ID (prevent double-crediting)
  const existing = await db
    .select({ id: transactionsTable.id })
    .from(transactionsTable)
    .where(eq(transactionsTable.txId, txId.toUpperCase().trim()))
    .limit(1);

  if (existing.length > 0) {
    res
      .status(409)
      .json({ message: "This transaction ID has already been used. Each payment can only be deposited once." });
    return;
  }

  // 3️⃣  Validate txId format against Tanzania mobile money patterns
  const txIdClean = txId.toUpperCase().trim();
  const isLegitimate = isValidTxId(txIdClean, method);

  // 4️⃣  Insert transaction record
  const [tx] = await db
    .insert(transactionsTable)
    .values({
      userId,
      amount: String(amount),
      txId: txIdClean,
      method,
      status: isLegitimate ? "approved" : "pending",
    })
    .returning();

  // 5️⃣  Auto-credit balance for legitimate transactions
  if (isLegitimate) {
    await db
      .update(usersTable)
      .set({ balance: sql`${usersTable.balance} + ${amount}` })
      .where(eq(usersTable.id, userId));
  }

  res.status(201).json({
    ...serializeTx(tx),
    autoApproved: isLegitimate,
    message: isLegitimate
      ? `TZS ${amount.toLocaleString()} has been credited to your account.`
      : "Your deposit has been submitted and is pending admin review.",
  });
});

// ─── GET /deposits ────────────────────────────────────────────────────────────
router.get("/deposits", requireAuth, async (req, res): Promise<void> => {
  const userId = req.authUser!.id;
  const txs = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(transactionsTable.createdAt);
  res.json(txs.map(serializeTx));
});

export default router;
