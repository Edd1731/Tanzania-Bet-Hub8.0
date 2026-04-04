import { Router, type IRouter } from "express";
import { db, transactionsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateDepositBody } from "@workspace/api-zod";
import { verifyMpesaTzTransaction, isMpesaConfigured } from "../services/mpesa-tz";

const router: IRouter = Router();

// ─── Fallback: Tanzania txId pattern matching ─────────────────────────────────
// Used when M-Pesa API credentials are not yet configured.
const TX_PATTERNS: { method: RegExp[]; pattern: RegExp }[] = [
  { method: [/mpesa/i],   pattern: /^[A-Z]{2,4}[0-9]{7,12}$/ },
  { method: [/tigo/i],    pattern: /^(T[0-9]{8,10}|SA[A-Z0-9]{5,12})$/ },
  { method: [/halo/i],    pattern: /^H[A-Z]?[0-9]{7,12}$/ },
  { method: [/airtel/i],  pattern: /^A(I|IT)?[0-9]{7,12}$/ },
];
const GENERIC_TX_PATTERN = /^[A-Z0-9]{6,20}$/;

function patternMatchValid(txId: string, method: string): boolean {
  const upper = txId.toUpperCase().trim();
  for (const { method: mp, pattern } of TX_PATTERNS) {
    if (mp.some(r => r.test(method))) return pattern.test(upper);
  }
  return GENERIC_TX_PATTERN.test(upper);
}

// ─── Serialise ────────────────────────────────────────────────────────────────

function serializeTx(tx: typeof transactionsTable.$inferSelect) {
  return {
    id:        tx.id,
    userId:    tx.userId,
    amount:    parseFloat(tx.amount),
    txId:      tx.txId,
    method:    tx.method,
    status:    tx.status,
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

  // 1. Minimum amount guard
  if (amount < 500) {
    res.status(400).json({ message: "Minimum deposit is TZS 500." });
    return;
  }

  // 2. Duplicate txId guard — one payment reference can only be used once
  const txIdClean = txId.toUpperCase().trim();
  const existing = await db
    .select({ id: transactionsTable.id })
    .from(transactionsTable)
    .where(eq(transactionsTable.txId, txIdClean))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({
      message:
        "This transaction ID has already been used. Each payment can only be deposited once.",
    });
    return;
  }

  // 3. Verification: live API if configured, pattern matching if not
  let isVerified = false;
  let verificationMode: "live_api" | "pattern_match" | "pending" = "pending";
  let verifiedAmount = amount;
  let declineReason: string | null = null;

  if (isMpesaConfigured() && /mpesa|tigo|halo|airtel/i.test(method)) {
    // ── Live M-Pesa TZ API verification ──
    try {
      const result = await verifyMpesaTzTransaction(txIdClean, amount);
      if (result.verified) {
        isVerified       = true;
        verifiedAmount   = result.amount; // use the API-confirmed amount
        verificationMode = "live_api";
      } else {
        // Specific rejection from the live API — decline immediately
        declineReason    = result.reason;
        verificationMode = "live_api";
      }
    } catch (err: any) {
      // If the API call itself fails (network error, etc.) fall back to pattern
      if (err?.message !== "MPESA_TZ_NOT_CONFIGURED") {
        console.error("[mpesa-tz] API error, falling back to pattern match:", err.message);
      }
      isVerified       = patternMatchValid(txIdClean, method);
      verificationMode = "pattern_match";
    }
  } else {
    // ── Pattern matching fallback ──
    isVerified       = patternMatchValid(txIdClean, method);
    verificationMode = "pattern_match";
  }

  // 4. Hard-decline from live API
  if (declineReason) {
    res.status(422).json({
      message: `Payment could not be verified: ${declineReason}`,
      verificationMode,
    });
    return;
  }

  // 5. Insert transaction record
  const finalStatus = isVerified ? "approved" : "pending";

  const [tx] = await db
    .insert(transactionsTable)
    .values({
      userId,
      amount:  String(verifiedAmount),
      txId:    txIdClean,
      method,
      status:  finalStatus,
    })
    .returning();

  // 6. Auto-credit balance for verified transactions
  if (isVerified) {
    await db
      .update(usersTable)
      .set({ balance: sql`${usersTable.balance} + ${verifiedAmount}` })
      .where(eq(usersTable.id, userId));
  }

  // 7. Respond with status and helpful context for the UI
  res.status(201).json({
    ...serializeTx(tx),
    autoApproved:     isVerified,
    verificationMode,
    message: isVerified
      ? `TZS ${verifiedAmount.toLocaleString()} has been credited to your account.`
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
