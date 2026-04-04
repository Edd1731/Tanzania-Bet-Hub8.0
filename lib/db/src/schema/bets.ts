import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { eventsTable } from "./events";

export const betsTable = pgTable("bets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  eventId: integer("event_id").notNull().references(() => eventsTable.id),
  choice: text("choice").notNull(), // 'home' | 'draw' | 'away'
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  potentialWin: numeric("potential_win", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'won' | 'lost'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBetSchema = createInsertSchema(betsTable).omit({ id: true, createdAt: true });
export type InsertBet = z.infer<typeof insertBetSchema>;
export type Bet = typeof betsTable.$inferSelect;
