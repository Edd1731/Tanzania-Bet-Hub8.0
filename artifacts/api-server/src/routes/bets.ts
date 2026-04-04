import { Router, type IRouter } from "express";
import { db, betsTable, eventsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
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

// ─── Poisson engine (mirrors frontend logic) ──────────────────────────────────
function poisson(lambda: number, k: number): number {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return Math.max(0, p);
}

function clip(odds: number, lo = 1.05, hi = 150): number {
  return Math.round(Math.max(lo, Math.min(hi, odds)) * 100) / 100;
}

function estimateLambdas(H: number, D: number, A: number, O25: number): [number, number] {
  const pH = 1 / H, pA = 1 / A;
  const tot = pH + 1 / D + pA;
  const ph = pH / tot, pa = pA / tot;
  const pOver = Math.min(0.93, Math.max(0.1, 1 / O25));
  const lambdaTotal = 1.0 + pOver * 3.8;
  const homeShare = 0.45 + ph * 0.55;
  return [Math.max(0.2, lambdaTotal * homeShare), Math.max(0.2, lambdaTotal * (1 - homeShare))];
}

type Score = { h: number; a: number; p: number };

function scoreMatrix(lH: number, lA: number): Score[] {
  const mat: Score[] = [];
  for (let h = 0; h <= 5; h++)
    for (let a = 0; a <= 5; a++)
      mat.push({ h, a, p: poisson(lH, h) * poisson(lA, a) });
  return mat;
}

function dcOdds(o1: number, o2: number): number {
  return clip((1 / (1 / o1 + 1 / o2)) * 0.95);
}

function resolveOdds(choice: string, event: typeof eventsTable.$inferSelect): number | null {
  const H  = parseFloat(event.oddsHome);
  const D  = parseFloat(event.oddsDraw);
  const A  = parseFloat(event.oddsAway);
  const O25 = event.oddsO25 ? parseFloat(event.oddsO25) : 1.85;
  const pn  = (v: string | null | undefined) => v ? parseFloat(v) : null;

  // ── Simple stored odds ──────────────────────────────────────────
  switch (choice) {
    case "home":     return H;
    case "draw":     return D;
    case "away":     return A;
    case "dc_1x":    return dcOdds(H, D);
    case "dc_x2":    return dcOdds(D, A);
    case "dc_12":    return dcOdds(H, A);
    case "ou_o15":   return pn(event.oddsO15) ?? 1.25;
    case "ou_u15":   return pn(event.oddsU15) ?? 3.50;
    case "ou_o25":   return pn(event.oddsO25) ?? 1.90;
    case "ou_u25":   return pn(event.oddsU25) ?? 1.85;
    case "ou_o35":   return pn(event.oddsO35) ?? 2.80;
    case "ou_u35":   return pn(event.oddsU35) ?? 1.40;
    case "btts_yes": return pn(event.oddsBttsY) ?? 1.75;
    case "btts_no":  return pn(event.oddsBttsN) ?? 1.95;
  }

  // ── Poisson-derived markets ─────────────────────────────────────
  const [lH, lA] = estimateLambdas(H, D, A, O25);
  const mat = scoreMatrix(lH, lA);
  const sumP = (pred: (s: Score) => boolean) => mat.filter(pred).reduce((a, s) => a + s.p, 0);

  // Correct Score: cs_{h}{a}  (e.g. cs_22 = 2-2, cs_10 = 1-0)
  if (choice.startsWith("cs_")) {
    const code = choice.slice(3);           // e.g. "22", "10", "31"
    if (code.length < 2) return null;
    // Support multi-digit scores: first char = home goals, rest = away goals
    const hg = parseInt(code[0]!);
    const ag = parseInt(code.slice(1));
    if (isNaN(hg) || isNaN(ag)) return null;
    const p = poisson(lH, hg) * poisson(lA, ag);
    if (p <= 0) return null;
    return clip((1 / p) * 1.18, 1.5, 150);
  }

  // 1st Half Result: ht_h, ht_d, ht_a
  if (choice === "ht_h" || choice === "ht_d" || choice === "ht_a") {
    const lHh = lH * 0.42, lAh = lA * 0.42;
    const hm = scoreMatrix(lHh, lAh);
    const pH1 = hm.filter(s => s.h > s.a).reduce((a, s) => a + s.p, 0);
    const pD1 = hm.filter(s => s.h === s.a).reduce((a, s) => a + s.p, 0);
    const pA1 = hm.filter(s => s.h < s.a).reduce((a, s) => a + s.p, 0);
    const m = 1.12;
    if (choice === "ht_h") return clip((1 / pH1) * m);
    if (choice === "ht_d") return clip((1 / pD1) * m);
    return clip((1 / pA1) * m);
  }

  // 1st Half O/U: ht_o05, ht_u05, ht_o15, ht_u15
  if (choice.startsWith("ht_o") || choice.startsWith("ht_u")) {
    const lHh = lH * 0.42, lAh = lA * 0.42;
    const hm = scoreMatrix(lHh, lAh);
    const overP = (n: number) => hm.filter(s => s.h + s.a > n).reduce((a, s) => a + s.p, 0);
    const m = 1.1;
    if (choice === "ht_o05") return clip((1 / overP(0.5)) * m);
    if (choice === "ht_u05") return clip((1 / (1 - overP(0.5))) * m);
    if (choice === "ht_o15") return clip((1 / overP(1.5)) * m);
    if (choice === "ht_u15") return clip((1 / (1 - overP(1.5))) * m);
    return null;
  }

  // HT/FT: htft_{ht}{ft}  e.g. htft_11, htft_x2, htft_2x
  if (choice.startsWith("htft_")) {
    const code = choice.slice(5).toLowerCase(); // e.g. "11", "x2", "2x"
    if (code.length < 2) return null;
    const lHh = lH * 0.42, lAh = lA * 0.42;
    const htMat = scoreMatrix(lHh, lAh);
    const htP = (pred: (s: Score) => boolean) => htMat.filter(pred).reduce((a, s) => a + s.p, 0);
    const ftP = (pred: (s: Score) => boolean) => mat.filter(pred).reduce((a, s) => a + s.p, 0);

    const htCode = code[0]!;
    const ftCode = code[1]!;
    const htPred = htCode === "1" ? (s: Score) => s.h > s.a : htCode === "x" ? (s: Score) => s.h === s.a : (s: Score) => s.h < s.a;
    const ftPred = ftCode === "1" ? (s: Score) => s.h > s.a : ftCode === "x" ? (s: Score) => s.h === s.a : (s: Score) => s.h < s.a;
    const pHt = htP(htPred), pFt = ftP(ftPred);
    if (pHt <= 0 || pFt <= 0) return null;
    return clip((1 / (pHt * pFt * 1.05)) * 1.15, 1.5, 150);
  }

  // Win to Nil: wtn_h, wtn_a
  if (choice === "wtn_h") {
    const p = sumP(s => s.h > s.a && s.a === 0);
    return p > 0 ? clip((1 / p) * 1.12) : null;
  }
  if (choice === "wtn_a") {
    const p = sumP(s => s.a > s.h && s.h === 0);
    return p > 0 ? clip((1 / p) * 1.12) : null;
  }

  // BTTS + Result: btr_b1, btr_bx, btr_b2, btr_n1, btr_nx, btr_n2
  if (choice.startsWith("btr_")) {
    const code = choice.slice(4); // b1, bx, b2, n1, nx, n2
    const btts = (s: Score) => s.h > 0 && s.a > 0;
    const nbtts = (s: Score) => s.h === 0 || s.a === 0;
    const home = (s: Score) => s.h > s.a;
    const draw = (s: Score) => s.h === s.a;
    const away = (s: Score) => s.h < s.a;
    const combos: Record<string, (s: Score) => boolean> = {
      b1: s => btts(s) && home(s), bx: s => btts(s) && draw(s), b2: s => btts(s) && away(s),
      n1: s => nbtts(s) && home(s), nx: s => nbtts(s) && draw(s), n2: s => nbtts(s) && away(s),
    };
    const pred = combos[code];
    if (!pred) return null;
    const p = sumP(pred);
    return p > 0 ? clip((1 / p) * 1.13) : null;
  }

  // Asian Handicap: ah_h{line} / ah_a{line}  e.g. ah_h-0.5, ah_a+1
  if (choice.startsWith("ah_h") || choice.startsWith("ah_a")) {
    const isHome = choice.startsWith("ah_h");
    const lineStr = choice.slice(4);
    const line = parseFloat(lineStr);
    if (isNaN(line)) return null;
    const pHome = mat.reduce((acc, s) => {
      const diff = s.h - s.a;
      if (diff > line)  return acc + s.p;
      if (diff === line) return acc + s.p * 0.5;
      return acc;
    }, 0);
    const pAway = 1 - pHome;
    const p = isHome ? pHome : pAway;
    if (p <= 0) return null;
    return clip((1 / p) * 1.1);
  }

  return null;
}

router.post("/bets", requireAuth, async (req, res): Promise<void> => {
  const { eventId, choice, amount } = req.body ?? {};
  if (!eventId || typeof choice !== "string" || !choice || typeof amount !== "number" || amount <= 0) {
    res.status(400).json({ message: "eventId, choice (string) and amount (positive number) are required" });
    return;
  }
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
