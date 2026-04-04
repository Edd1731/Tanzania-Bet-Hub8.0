import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  matchId: text("match_id").notNull().unique(),
  teamHome: text("team_home").notNull(),
  teamAway: text("team_away").notNull(),
  league: text("league").notNull(),
  // 1X2 main market
  oddsHome: numeric("odds_home", { precision: 6, scale: 2 }).notNull(),
  oddsDraw: numeric("odds_draw", { precision: 6, scale: 2 }).notNull(),
  oddsAway: numeric("odds_away", { precision: 6, scale: 2 }).notNull(),
  // Over/Under Goals
  oddsO15: numeric("odds_o15", { precision: 6, scale: 2 }).default("1.25"),
  oddsU15: numeric("odds_u15", { precision: 6, scale: 2 }).default("3.50"),
  oddsO25: numeric("odds_o25", { precision: 6, scale: 2 }).default("1.90"),
  oddsU25: numeric("odds_u25", { precision: 6, scale: 2 }).default("1.85"),
  oddsO35: numeric("odds_o35", { precision: 6, scale: 2 }).default("2.80"),
  oddsU35: numeric("odds_u35", { precision: 6, scale: 2 }).default("1.40"),
  // Both Teams to Score
  oddsBttsY: numeric("odds_btts_y", { precision: 6, scale: 2 }).default("1.75"),
  oddsBttsN: numeric("odds_btts_n", { precision: 6, scale: 2 }).default("1.95"),
  // Status / time
  status: text("status").notNull().default("active"),
  startsAt: timestamp("starts_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
