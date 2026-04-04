import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SignupBody, LoginBody } from "@workspace/api-zod";
import { signToken } from "../middlewares/auth";

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

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    res.status(400).json({ message: firstIssue ? `${firstIssue.path.join(".")}: ${firstIssue.message}` : "Invalid request" });
    return;
  }

  const { name, phone, password } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
  if (existing.length > 0) {
    res.status(400).json({ message: "Phone already registered" });
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ name, phone, password: hash }).returning();

  const token = signToken({ id: user.id, isAdmin: user.isAdmin });
  res.status(201).json({ token, user: serializeUser(user) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    res.status(400).json({ message: firstIssue ? `${firstIssue.path.join(".")}: ${firstIssue.message}` : "Invalid request" });
    return;
  }

  const { phone, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
  if (!user) {
    res.status(401).json({ message: "Invalid phone or password" });
    return;
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    res.status(401).json({ message: "Invalid phone or password" });
    return;
  }

  const token = signToken({ id: user.id, isAdmin: user.isAdmin });
  res.json({ token, user: serializeUser(user) });
});

export default router;
