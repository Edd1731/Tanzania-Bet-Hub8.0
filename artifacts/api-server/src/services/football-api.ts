/**
 * Free API Live Football Data — via RapidAPI
 * Host: free-api-live-football-data.p.rapidapi.com
 *
 * How to get your key:
 *   1. Open RapidAPI → you are already on the "Free API Live Football Data" page
 *   2. The X-RapidAPI-Key value shown there IS your key
 *   3. Click on that field to select the full key, copy it
 *   4. Paste it into Replit Secrets as RAPIDAPI_KEY
 *
 * Required secret (set in Replit Secrets):
 *   RAPIDAPI_KEY  — your RapidAPI account key (same key for all APIs on RapidAPI)
 */

const BASE_URL = "https://free-api-live-football-data.p.rapidapi.com";
const RAPIDAPI_HOST = "free-api-live-football-data.p.rapidapi.com";

export interface ApiFixture {
  fixtureId:   number;
  matchId:     string;
  teamHome:    string;
  teamAway:    string;
  league:      string;
  country:     string;
  logoHome:    string;
  logoAway:    string;
  leagueLogo:  string;
  startsAt:    Date;
  statusShort: string;
  elapsed:     number | null;
  scoreHome:   number | null;
  scoreAway:   number | null;
}

// ─── Auth check ───────────────────────────────────────────────────────────────

export function isFootballApiConfigured(): boolean {
  return !!process.env.RAPIDAPI_KEY;
}

function headers(): Record<string, string> {
  return {
    "x-rapidapi-key":  process.env.RAPIDAPI_KEY!,
    "x-rapidapi-host": RAPIDAPI_HOST,
  };
}

// ─── Generic fetch helper with logging ───────────────────────────────────────

async function apiFetch(path: string): Promise<any> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: headers(),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return data;
}

// ─── Response parsers ─────────────────────────────────────────────────────────
// The "Free API Live Football Data" API wraps results in { response: [...] }
// similar to API-Football v3.

function statusShortFromLong(longStatus: string, elapsed?: number): string {
  const s = (longStatus ?? "").toLowerCase();
  if (s.includes("not started") || s === "ns")      return "NS";
  if (s.includes("first half")  || s === "1h")      return "1H";
  if (s.includes("halftime")    || s === "ht")      return "HT";
  if (s.includes("second half") || s === "2h")      return "2H";
  if (s.includes("extra time")  || s === "et")      return "ET";
  if (s.includes("penalty")     || s === "p")       return "PEN";
  if (s.includes("finished")    || s === "ft")      return "FT";
  if (s.includes("full time")   || s === "ft")      return "FT";
  if (s.includes("postponed")   || s === "pst")     return "PST";
  if (s.includes("cancelled")   || s === "canc")    return "CANC";
  if (s.includes("abandoned")   || s === "abt")     return "ABD";
  if (s.includes("suspended")   || s === "susp")    return "SUSP";
  if (s.includes("live") && (elapsed ?? 0) > 45)    return "2H";
  if (s.includes("live"))                           return "1H";
  return "NS";
}

function parseFixture(f: any): ApiFixture | null {
  try {
    // Support both API-Football v3 format and Free API Live Football format
    // API-Football v3: f.fixture, f.teams, f.goals, f.league
    // Free API: may vary — handle both
    const fixtureId: number =
      f.fixture?.id ?? f.id ?? f.match_id ?? f.fixtureId ?? 0;

    if (!fixtureId) return null;

    const teamHome: string =
      f.teams?.home?.name ?? f.homeTeam?.name ?? f.home_team ?? f.home ?? "";
    const teamAway: string =
      f.teams?.away?.name ?? f.awayTeam?.name ?? f.away_team ?? f.away ?? "";

    if (!teamHome || !teamAway) return null;

    const league: string =
      f.league?.name ?? f.competition?.name ?? f.tournament ?? "Unknown League";
    const country: string =
      f.league?.country ?? f.country?.name ?? f.area?.name ?? "";
    const logoHome: string =
      f.teams?.home?.logo ?? f.homeTeam?.logo ?? f.home_team_logo ?? "";
    const logoAway: string =
      f.teams?.away?.logo ?? f.awayTeam?.logo ?? f.away_team_logo ?? "";
    const leagueLogo: string =
      f.league?.logo ?? f.competition?.emblem ?? "";

    const dateStr: string =
      f.fixture?.date ?? f.date ?? f.match_date ?? f.kickoff ?? "";
    const startsAt: Date = dateStr ? new Date(dateStr) : new Date();

    const statusLong: string =
      f.fixture?.status?.long ?? f.status?.long ?? f.matchStatus ?? f.status ?? "";
    const statusShortRaw: string =
      f.fixture?.status?.short ?? f.status?.short ?? "";
    const elapsed: number | null =
      f.fixture?.status?.elapsed ?? f.elapsed ?? f.minute ?? null;

    const statusShort = statusShortRaw || statusShortFromLong(statusLong, elapsed ?? undefined);

    const scoreHome: number | null =
      f.goals?.home ?? f.score?.home ?? f.home_score ?? f.homeGoals ?? null;
    const scoreAway: number | null =
      f.goals?.away ?? f.score?.away ?? f.away_score ?? f.awayGoals ?? null;

    return {
      fixtureId,
      matchId:    `api-${fixtureId}`,
      teamHome,
      teamAway,
      league,
      country,
      logoHome,
      logoAway,
      leagueLogo,
      startsAt,
      statusShort,
      elapsed:   elapsed ?? null,
      scoreHome,
      scoreAway,
    };
  } catch (e) {
    console.warn("[football-api] parseFixture error:", e);
    return null;
  }
}

function parseResponse(data: any): ApiFixture[] {
  // Handle both { response: [...] } and { data: [...] } and plain arrays
  const items: any[] = Array.isArray(data)
    ? data
    : (data?.response ?? data?.data ?? data?.fixtures ?? data?.matches ?? []);

  return items
    .map(parseFixture)
    .filter((f): f is ApiFixture => f !== null);
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Fetch all currently live fixtures.
 * Tries several common endpoint paths for this API.
 */
export async function fetchLiveFixtures(): Promise<ApiFixture[]> {
  const paths = [
    "/football-get-all-livescore",
    "/football-live-scores",
    "/football-livescores",
    "/livescores",
  ];

  for (const path of paths) {
    try {
      const data = await apiFetch(path);
      const fixtures = parseResponse(data);
      if (fixtures.length > 0 || data?.response !== undefined || Array.isArray(data)) {
        console.log(`[football-api] live: ${path} → ${fixtures.length} fixtures`);
        return fixtures;
      }
    } catch (e: any) {
      console.log(`[football-api] live path ${path} failed: ${e.message}`);
    }
  }

  console.warn("[football-api] live: all paths failed");
  return [];
}

/**
 * Fetch today's and the next 2 days' fixtures.
 */
export async function fetchAllUpcomingFixtures(): Promise<ApiFixture[]> {
  const dates: string[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const results: ApiFixture[] = [];

  for (const date of dates) {
    const paths = [
      `/football-get-fixtures-by-date?date=${date}`,
      `/football-fixtures-by-date?date=${date}`,
      `/fixtures?date=${date}`,
      `/football-get-matches-by-date?date=${date}`,
    ];

    let fetched = false;
    for (const path of paths) {
      try {
        const data = await apiFetch(path);
        const fixtures = parseResponse(data);
        if (fixtures.length > 0 || Array.isArray(data?.response)) {
          console.log(`[football-api] upcoming ${date}: ${path} → ${fixtures.length} fixtures`);
          results.push(...fixtures);
          fetched = true;
          break;
        }
      } catch (e: any) {
        console.log(`[football-api] upcoming ${date} path ${path} failed: ${e.message}`);
      }
    }

    if (!fetched) {
      console.warn(`[football-api] upcoming ${date}: all paths failed`);
    }

    // Small delay between date requests to be gentle on rate limits
    if (date !== dates[dates.length - 1]) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // De-duplicate by fixtureId
  const seen = new Set<number>();
  return results.filter(f => {
    if (seen.has(f.fixtureId)) return false;
    seen.add(f.fixtureId);
    return true;
  });
}

/**
 * Probe the API to find working endpoints — useful for debugging.
 * Tries a few common paths and logs results.
 */
export async function probeApiEndpoints(): Promise<{ path: string; status: string; count: number }[]> {
  const testPaths = [
    "/football-get-all-livescore",
    "/football-live-scores",
    `/football-get-fixtures-by-date?date=${new Date().toISOString().slice(0, 10)}`,
    `/football-fixtures-by-date?date=${new Date().toISOString().slice(0, 10)}`,
    "/football-get-popular-leagues",
    "/football-get-all-leagues",
    "/leagues",
  ];

  const results = [];
  for (const path of testPaths) {
    try {
      const data = await apiFetch(path);
      const items = parseResponse(data);
      results.push({ path, status: "ok", count: items.length });
    } catch (e: any) {
      results.push({ path, status: e.message.slice(0, 60), count: 0 });
    }
    await new Promise(r => setTimeout(r, 200));
  }
  return results;
}
