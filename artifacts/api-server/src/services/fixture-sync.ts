/**
 * Fixture Sync Orchestrator
 *
 * • On startup: fetch all upcoming + live fixtures (if API key is set)
 * • Every 5 minutes: re-fetch live fixtures (score / elapsed updates)
 * • Every 30 minutes: re-fetch upcoming fixtures (new games appear)
 *
 * Odds are generated algorithmically — each fixture gets deterministic
 * plausible odds based on its fixtureId so they don't shift on every sync.
 */

import { db, eventsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  fetchLiveFixtures,
  fetchAllUpcomingFixtures,
  isFootballApiConfigured,
  type ApiFixture,
} from "./football-api";

// ─── Odds generation ──────────────────────────────────────────────────────────
// Creates deterministic, realistic-looking odds for each fixture.
// Using a simple seeded number approach based on fixtureId.

function seededRandom(seed: number, offset = 0): number {
  const x = Math.sin(seed + offset) * 10000;
  return x - Math.floor(x);
}

function generateOdds(fixtureId: number) {
  const r = (off: number) => seededRandom(fixtureId, off);

  // Home win probability tilted slightly toward home advantage
  const pHome = 0.35 + r(1) * 0.25;   // 35–60 %
  const pDraw = 0.20 + r(2) * 0.12;   // 20–32 %
  const pAway = Math.max(0.10, 1 - pHome - pDraw);

  // Apply a 7% house margin and round to 2 dp
  const margin = 0.93;
  const ro = (p: number) => Math.round((margin / p) * 100) / 100;

  const oddsHome = Math.min(12.00, Math.max(1.20, ro(pHome)));
  const oddsDraw = Math.min(8.00,  Math.max(2.50, ro(pDraw)));
  const oddsAway = Math.min(15.00, Math.max(1.15, ro(pAway)));

  // Over / Under — lean toward more or fewer goals based on seed
  const goalTend = r(5); // 0 = low scoring, 1 = high scoring
  const oddsO15  = Math.round((1.10 + goalTend * 0.30) * 100) / 100;
  const oddsU15  = Math.round((3.80 - goalTend * 0.60) * 100) / 100;
  const oddsO25  = Math.round((1.60 + goalTend * 0.55) * 100) / 100;
  const oddsU25  = Math.round((2.30 - goalTend * 0.40) * 100) / 100;
  const oddsO35  = Math.round((2.40 + goalTend * 0.80) * 100) / 100;
  const oddsU35  = Math.round((1.50 - goalTend * 0.20) * 100) / 100;

  // BTTS
  const bttsTend  = r(7);
  const oddsBttsY = Math.round((1.60 + bttsTend * 0.40) * 100) / 100;
  const oddsBttsN = Math.round((2.10 - bttsTend * 0.30) * 100) / 100;

  return { oddsHome, oddsDraw, oddsAway, oddsO15, oddsU15, oddsO25, oddsU25, oddsO35, oddsU35, oddsBttsY, oddsBttsN };
}

// ─── Upsert logic ─────────────────────────────────────────────────────────────

// Map API status to row status (controls whether users can bet)
function toRowStatus(statusShort: string): string {
  if (["FT", "AET", "PEN", "AWD", "WO"].includes(statusShort)) return "finished";
  if (["CANC", "PST", "ABD", "INT"].includes(statusShort))      return "cancelled";
  return "active";
}

async function upsertFixture(f: ApiFixture): Promise<void> {
  const rowStatus  = toRowStatus(f.statusShort);
  const existing   = await db.select({ id: eventsTable.id, oddsHome: eventsTable.oddsHome })
                              .from(eventsTable)
                              .where(eq(eventsTable.matchId, f.matchId))
                              .limit(1);

  if (existing.length > 0) {
    // Update all synced fields — preserve manually-set odds from admin
    await db.update(eventsTable).set({
      scoreHome:   f.scoreHome,
      scoreAway:   f.scoreAway,
      elapsed:     f.elapsed,
      statusShort: f.statusShort,
      status:      rowStatus,
      teamHome:    f.teamHome,
      teamAway:    f.teamAway,
      logoHome:    f.logoHome,
      logoAway:    f.logoAway,
      league:      f.league,
      country:     f.country,
      leagueLogo:  f.leagueLogo,
      startsAt:    f.startsAt,
    }).where(eq(eventsTable.matchId, f.matchId));
  } else {
    // New fixture — generate odds
    const odds = generateOdds(f.fixtureId);
    await db.insert(eventsTable).values({
      matchId:     f.matchId,
      teamHome:    f.teamHome,
      teamAway:    f.teamAway,
      league:      f.league,
      country:     f.country,
      logoHome:    f.logoHome,
      logoAway:    f.logoAway,
      leagueLogo:  f.leagueLogo,
      oddsHome:    String(odds.oddsHome),
      oddsDraw:    String(odds.oddsDraw),
      oddsAway:    String(odds.oddsAway),
      oddsO15:     String(odds.oddsO15),
      oddsU15:     String(odds.oddsU15),
      oddsO25:     String(odds.oddsO25),
      oddsU25:     String(odds.oddsU25),
      oddsO35:     String(odds.oddsO35),
      oddsU35:     String(odds.oddsU35),
      oddsBttsY:   String(odds.oddsBttsY),
      oddsBttsN:   String(odds.oddsBttsN),
      scoreHome:   f.scoreHome,
      scoreAway:   f.scoreAway,
      elapsed:     f.elapsed,
      statusShort: f.statusShort,
      status:      rowStatus,
      startsAt:    f.startsAt,
    }).onConflictDoNothing();
  }
}

// ─── Public sync functions ────────────────────────────────────────────────────

export async function syncLiveFixtures(): Promise<{ synced: number; errors: number }> {
  let synced = 0; let errors = 0;
  try {
    const fixtures = await fetchLiveFixtures();
    for (const f of fixtures) {
      try { await upsertFixture(f); synced++; }
      catch (e) { console.error("[sync] live upsert error:", e); errors++; }
    }
    console.log(`[sync] live: ${synced} updated, ${errors} errors`);
  } catch (e) {
    console.error("[sync] fetchLiveFixtures failed:", e);
    errors++;
  }
  return { synced, errors };
}

export async function syncUpcomingFixtures(): Promise<{ synced: number; errors: number }> {
  let synced = 0; let errors = 0;
  try {
    const fixtures = await fetchAllUpcomingFixtures();
    for (const f of fixtures) {
      try { await upsertFixture(f); synced++; }
      catch (e) { console.error("[sync] upcoming upsert error:", e); errors++; }
    }
    console.log(`[sync] upcoming: ${synced} upserted, ${errors} errors`);
  } catch (e) {
    console.error("[sync] fetchAllUpcomingFixtures failed:", e);
    errors++;
  }
  return { synced, errors };
}

// ─── Auto-scheduler ───────────────────────────────────────────────────────────

let liveInterval:     ReturnType<typeof setInterval> | null = null;
let upcomingInterval: ReturnType<typeof setInterval> | null = null;

export function startSyncScheduler(): void {
  if (!isFootballApiConfigured()) {
    console.log("[sync] RAPIDAPI_KEY not set — live fixture sync disabled.");
    return;
  }

  // Initial load
  syncUpcomingFixtures();

  // Live scores every 5 minutes
  liveInterval = setInterval(() => syncLiveFixtures(), 5 * 60 * 1000);

  // Upcoming fixtures every 30 minutes
  upcomingInterval = setInterval(() => syncUpcomingFixtures(), 30 * 60 * 1000);

  console.log("[sync] Fixture sync scheduler started.");
}

export function stopSyncScheduler(): void {
  if (liveInterval)     clearInterval(liveInterval);
  if (upcomingInterval) clearInterval(upcomingInterval);
}
