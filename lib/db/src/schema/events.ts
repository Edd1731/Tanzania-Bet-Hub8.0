import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  matchId: text("match_id").notNull().unique(),
  teamHome: text("team_home").notNull(),
  teamAway: text("team_away").notNull(),
  league: text("league").notNull(),
  oddsHome: numeric("odds_home", { precision: 6, scale: 2 }).notNull(),
  oddsDraw: numeric("odds_draw", { precision: 6, scale: 2 }).notNull(),
  oddsAway: numeric("odds_away", { precision: 6, scale: 2 }).notNull(),
  status: text("status").notNull().default("active"),
  startsAt: timestamp("starts_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
