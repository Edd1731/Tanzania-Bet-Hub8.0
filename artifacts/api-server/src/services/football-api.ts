/**
 * API-Football v3 via RapidAPI
 *
 * Free tier: 100 requests / day
 * Sign up: https://rapidapi.com/api-sports/api/api-football
 *
 * Required secret (set in Replit Secrets):
 *   RAPIDAPI_KEY  — your RapidAPI key
 *
 * Optional env var (shared):
 *   FOOTBALL_API_SEASON  — e.g. "2025" (defaults to current year)
 */

const BASE_URL = "https://api-football-v1.p.rapidapi.com/v3";

// Leagues to sync — covers Tanzania + major European competitions
export const LEAGUE_IDS = [
  264,  // Tanzania Premier League
  39,   // English Premier League
  140,  // La Liga
  2,    // UEFA Champions League
  3,    // UEFA Europa League
  135,  // Serie A
  78,   // Bundesliga
  61,   // Ligue 1
  307,  // Saudi Pro League
  848,  // UEFA Europa Conference League
];

export interface ApiFixture {
  fixtureId:   number;
  matchId:     string;   // "api-<fixtureId>"
  teamHome:    string;
  teamAway:    string;
  league:      string;
  country:     string;
  logoHome:    string;
  logoAway:    string;
  leagueLogo:  string;
  startsAt:    Date;
  statusShort: string;   // NS, 1H, HT, 2H, FT, AET, PEN, etc.
  elapsed:     number | null;
  scoreHome:   number | null;
  scoreAway:   number | null;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function isFootballApiConfigured(): boolean {
  return !!process.env.RAPIDAPI_KEY;
}

function headers(): Record<string, string> {
  return {
    "X-RapidAPI-Key":  process.env.RAPIDAPI_KEY!,
    "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentSeason(): number {
  const yr = new Date().getFullYear();
  // Football seasons: most run Aug–May, so if we're Jan–Jul we use previous year as season start
  const month = new Date().getMonth() + 1;
  return month >= 8 ? yr : yr - 1;
}

function parseFixture(f: any): ApiFixture {
  return {
    fixtureId:   f.fixture.id,
    matchId:     `api-${f.fixture.id}`,
    teamHome:    f.teams.home.name,
    teamAway:    f.teams.away.name,
    league:      f.league.name,
    country:     f.league.country ?? "",
    logoHome:    f.teams.home.logo ?? "",
    logoAway:    f.teams.away.logo ?? "",
    leagueLogo:  f.league.logo ?? "",
    startsAt:    new Date(f.fixture.date),
    statusShort: f.fixture.status?.short ?? "NS",
    elapsed:     f.fixture.status?.elapsed ?? null,
    scoreHome:   f.goals?.home   ?? null,
    scoreAway:   f.goals?.away   ?? null,
  };
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Fetch all live fixtures (any league, any status in-progress).
 * Uses only 1 API request regardless of how many leagues are being tracked.
 */
export async function fetchLiveFixtures(): Promise<ApiFixture[]> {
  const url = `${BASE_URL}/fixtures?live=all`;
  const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`API-Football live error: ${res.status}`);
  const data = await res.json() as any;
  const all: any[] = data.response ?? [];
  // Filter to only the leagues we track
  return all
    .filter((f: any) => LEAGUE_IDS.includes(f.league?.id))
    .map(parseFixture);
}

/**
 * Fetch today's and tomorrow's fixtures for a single league.
 * To conserve rate limits each call is one league.
 */
export async function fetchFixturesForLeague(leagueId: number): Promise<ApiFixture[]> {
  const season = process.env.FOOTBALL_API_SEASON
    ? parseInt(process.env.FOOTBALL_API_SEASON)
    : currentSeason();

  const today    = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  // Fetch 3 days of fixtures (today + next 2 days)
  const url = `${BASE_URL}/fixtures?league=${leagueId}&season=${season}&from=${fmt(today)}&to=${fmt(dayAfter)}`;
  const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    console.warn(`[football-api] league ${leagueId} returned ${res.status}`);
    return [];
  }
  const data = await res.json() as any;
  return (data.response ?? []).map(parseFixture);
}

/**
 * Fetch fixtures for ALL tracked leagues — one request per league.
 * Returns deduplicated list sorted by kick-off time.
 */
export async function fetchAllUpcomingFixtures(): Promise<ApiFixture[]> {
  const results = await Promise.allSettled(
    LEAGUE_IDS.map(id => fetchFixturesForLeague(id)),
  );

  const fixtures: ApiFixture[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") fixtures.push(...r.value);
  }

  // De-duplicate by fixtureId
  const seen = new Set<number>();
  return fixtures
    .filter(f => { if (seen.has(f.fixtureId)) return false; seen.add(f.fixtureId); return true; })
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
