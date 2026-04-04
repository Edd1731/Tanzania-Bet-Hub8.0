/**
 * Free API Live Football Data — via RapidAPI
 * Host: free-api-live-football-data.p.rapidapi.com
 *
 * Required secret: RAPIDAPI_KEY  (your RapidAPI account key)
 *
 * Key findings from API probing:
 *   - Date format:  YYYYMMDD  (e.g. 20260404)
 *   - Matches:      GET /football-get-matches-by-date?date=YYYYMMDD
 *   - Leagues:      GET /football-get-all-leagues
 *   - No separate live endpoint — filter matches by status.ongoing === true
 *   - Logo CDN:     images.fotmob.com  (Fotmob-backed API)
 */

const BASE_URL   = "https://free-api-live-football-data.p.rapidapi.com";
const RAPID_HOST = "free-api-live-football-data.p.rapidapi.com";

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

// ─── Config check ─────────────────────────────────────────────────────────────

export function isFootballApiConfigured(): boolean {
  return !!process.env.RAPIDAPI_KEY;
}

function headers(): Record<string, string> {
  return {
    "x-rapidapi-key":  process.env.RAPIDAPI_KEY!,
    "x-rapidapi-host": RAPID_HOST,
  };
}

// ─── Fotmob CDN logo helpers ──────────────────────────────────────────────────

function teamLogo(teamId: number): string {
  return `https://images.fotmob.com/image_resources/logo/teamlogo/${teamId}_small.png`;
}

function leagueLogo(leagueId: number): string {
  return `https://images.fotmob.com/image_resources/logo/leaguelogo/${leagueId}.png`;
}

// ─── Date formatting ──────────────────────────────────────────────────────────

function toApiDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

// ─── Status mapping ───────────────────────────────────────────────────────────
// API gives: status.started, status.ongoing, status.finished, status.cancelled
// plus halfs.firstHalfStarted / halfs.secondHalfStarted

interface ApiStatus {
  started:   boolean;
  ongoing:   boolean;
  finished:  boolean;
  cancelled: boolean;
  liveTime?: { short?: string; long?: string };
  halfs?: { firstHalfStarted?: string; secondHalfStarted?: string };
}

function deriveStatusShort(s: ApiStatus): string {
  if (s.cancelled)                                    return "CANC";
  if (s.finished)                                     return "FT";
  if (s.started && s.ongoing && s.halfs?.secondHalfStarted) return "2H";
  if (s.started && !s.ongoing && !s.finished)         return "HT";
  if (s.started && s.ongoing)                         return "1H";
  return "NS";
}

function deriveElapsed(s: ApiStatus): number | null {
  // liveTime.long is "49:05" (minutes:seconds)
  const long = s.liveTime?.long;
  if (!long) return null;
  const parts = long.split(":");
  const mins = parseInt(parts[0], 10);
  return isNaN(mins) ? null : mins;
}

// ─── Parse one match object ───────────────────────────────────────────────────

function parseMatch(m: any, leagueMap: Map<number, {name: string; ccode: string}>): ApiFixture | null {
  try {
    const fixtureId: number = m.id;
    if (!fixtureId) return null;

    const leagueId: number = m.leagueId ?? 0;
    const leagueInfo = leagueMap.get(leagueId);

    const teamHome = m.home?.longName ?? m.home?.name ?? "";
    const teamAway = m.away?.longName ?? m.away?.name ?? "";
    if (!teamHome || !teamAway) return null;

    const league  = leagueInfo?.name ?? "Unknown League";
    const country = leagueInfo?.ccode ?? "";

    const logoHome = m.home?.id ? teamLogo(m.home.id) : "";
    const logoAway = m.away?.id ? teamLogo(m.away.id) : "";
    const lgLogo   = leagueId   ? leagueLogo(leagueId) : "";

    // Parse kickoff time — API gives "DD.MM.YYYY HH:MM" (local), also has utcTime
    const utcTime: string = m.status?.utcTime ?? "";
    const startsAt = utcTime ? new Date(utcTime) : new Date(m.timeTS ?? Date.now());

    const status: ApiStatus = {
      started:   m.status?.started   ?? false,
      ongoing:   m.status?.ongoing   ?? false,
      finished:  m.status?.finished  ?? false,
      cancelled: m.status?.cancelled ?? false,
      liveTime:  m.status?.liveTime,
      halfs:     m.status?.halfs,
    };

    const statusShort = deriveStatusShort(status);
    const elapsed     = deriveElapsed(status);

    const scoreHome: number | null = m.home?.score ?? null;
    const scoreAway: number | null = m.away?.score ?? null;

    return {
      fixtureId,
      matchId: `foto-${fixtureId}`,
      teamHome,
      teamAway,
      league,
      country,
      logoHome,
      logoAway,
      leagueLogo: lgLogo,
      startsAt,
      statusShort,
      elapsed,
      scoreHome,
      scoreAway,
    };
  } catch (e) {
    console.warn("[football-api] parseMatch error:", e);
    return null;
  }
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function apiFetch(path: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: headers(),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// ─── Static fallback map (Fotmob league IDs — confirmed from API probing) ─────
const STATIC_LEAGUES: Record<number, {name: string; ccode: string}> = {
  // International
  42: { name: "Champions League",      ccode: "INT" },
  73: { name: "Europa League",         ccode: "INT" },
  10216: { name: "Conference League",  ccode: "INT" },
  77: { name: "World Cup",             ccode: "INT" },
  50: { name: "EURO",                  ccode: "INT" },
  44: { name: "Copa America",          ccode: "INT" },
  45: { name: "Copa Libertadores",     ccode: "INT" },
  299: { name: "Copa Sudamericana",    ccode: "INT" },
  289: { name: "Africa Cup of Nations",ccode: "INT" },
  526: { name: "CAF Champions League", ccode: "INT" },
  // England
  47: { name: "Premier League",        ccode: "ENG" },
  48: { name: "Championship",          ccode: "ENG" },
  49: { name: "League One",            ccode: "ENG" },
  51: { name: "League Two",            ccode: "ENG" },
  // Germany
  54: { name: "Bundesliga",            ccode: "GER" },
  84: { name: "2. Bundesliga",         ccode: "GER" },
  208: { name: "3. Liga",              ccode: "GER" },
  // Spain
  87: { name: "La Liga",               ccode: "ESP" },
  88: { name: "La Liga 2",             ccode: "ESP" },
  // Italy
  55: { name: "Serie A",               ccode: "ITA" },
  56: { name: "Serie B",               ccode: "ITA" },
  // France
  53: { name: "Ligue 1",               ccode: "FRA" },
  60: { name: "Ligue 2",               ccode: "FRA" },
  // Portugal
  61: { name: "Primeira Liga",         ccode: "POR" },
  185: { name: "Liga Portugal 2",      ccode: "POR" },
  // Netherlands
  57: { name: "Eredivisie",            ccode: "NED" },
  // Russia
  63: { name: "Russian Premier League",ccode: "RUS" },
  // Turkey
  71: { name: "Süper Lig",             ccode: "TUR" },
  165: { name: "TFF 1. Lig",           ccode: "TUR" },
  // Poland
  83: { name: "Ekstraklasa",           ccode: "POL" },
  // Scotland
  115: { name: "Scottish Premiership", ccode: "SCO" },
  // Belgium
  68: { name: "First Division A",      ccode: "BEL" },
  264: { name: "First Division B",     ccode: "BEL" },
  // Saudi Arabia
  307: { name: "Saudi Pro League",     ccode: "SAU" },
  // Tanzania
  384: { name: "NBC Premier League",   ccode: "TZA" },
  // Israel
  127: { name: "Israeli Premier League", ccode: "ISR" },
  // Others confirmed from API probing
  67:  { name: "Allsvenskan",           ccode: "SWE" },
  229: { name: "BGL Ligue",             ccode: "LUX" },
  232: { name: "First League",          ccode: "MNE" },
  173: { name: "PrvaLiga",              ccode: "SVN" },
  182: { name: "Superliga",             ccode: "SRB" },
  538: { name: "Super Lig",             ccode: "TUR" },
  9066: { name: "FKF Premier League",   ccode: "KEN" },
  9096: { name: "First League",         ccode: "BUL" },
  9473: { name: "National First Division", ccode: "RSA" },
  9498: { name: "Veikkausliiga",         ccode: "FIN" },
  // Domestic league pages (Fotmob internal IDs discovered from live data)
  899890: { name: "Ekstraklasa",         ccode: "POL" },
  899985: { name: "Ekstraklasa",         ccode: "POL" },
  900416: { name: "Fortuna Liga",        ccode: "CZE" },
  900474: { name: "Fortuna Liga",        ccode: "SVK" },
  900476: { name: "HNL",                 ccode: "CRO" },
  900477: { name: "SuperLiga",           ccode: "DEN" },
  900478: { name: "Eliteserien",         ccode: "NOR" },
  901093: { name: "Romanian Liga I",     ccode: "ROU" },
  901354: { name: "Swiss Super League",  ccode: "SUI" },
  901355: { name: "Prva liga",           ccode: "SRB" },
  901481: { name: "A-League",            ccode: "AUS" },
  901537: { name: "Premiership",         ccode: "SCO" },
  901568: { name: "3F Superliga",        ccode: "DEN" },
  901979: { name: "Nemzeti Bajnokság",   ccode: "HUN" },
  916561: { name: "Premiership",         ccode: "NIR" },
  918603: { name: "League of Ireland",   ccode: "IRL" },
  918604: { name: "Welsh Premier League", ccode: "WAL" },
  919925: { name: "Girabola",            ccode: "ANG" },
  920267: { name: "Premier League",      ccode: "GHA" },
  1000001263: { name: "Bundesliga",      ccode: "AUT" },
  1000001264: { name: "2. Liga",         ccode: "AUT" },
};

// Cache the league map — refresh once per hour
let leagueCacheTime = 0;
let leagueCache: Map<number, {name: string; ccode: string}> = new Map();

async function getLeagueMap(): Promise<Map<number, {name: string; ccode: string}>> {
  const now = Date.now();
  if (now - leagueCacheTime < 60 * 60_000 && leagueCache.size > 0) {
    return leagueCache;
  }

  // Start with static fallbacks
  const map = new Map<number, {name: string; ccode: string}>(
    Object.entries(STATIC_LEAGUES).map(([k, v]) => [Number(k), v])
  );

  try {
    const data = await apiFetch("/football-get-all-leagues");
    const leagues: any[] = data?.response?.leagues ?? [];
    for (const l of leagues) {
      if (l.id) map.set(l.id, { name: l.name ?? "Unknown", ccode: l.ccode ?? "" });
    }
    console.log(`[football-api] league map loaded: ${map.size} leagues (${leagues.length} from API + static fallbacks)`);
  } catch (e: any) {
    console.warn("[football-api] getLeagueMap API fetch failed, using static map:", e.message);
  }

  leagueCache = map;
  leagueCacheTime = now;
  return map;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch live fixtures (status.ongoing === true) from today's match list.
 */
export async function fetchLiveFixtures(): Promise<ApiFixture[]> {
  const leagueMap = await getLeagueMap();
  const dateStr   = toApiDate(new Date());

  const data = await apiFetch(`/football-get-matches-by-date?date=${dateStr}`);
  const matches: any[] = data?.response?.matches ?? [];

  const live = matches
    .filter(m => m.status?.ongoing === true)
    .map(m => parseMatch(m, leagueMap))
    .filter((f): f is ApiFixture => f !== null);

  console.log(`[football-api] live: ${live.length} ongoing matches`);
  return live;
}

/**
 * Fetch today + tomorrow + day after fixtures (all statuses).
 */
export async function fetchAllUpcomingFixtures(): Promise<ApiFixture[]> {
  const leagueMap = await getLeagueMap();
  const results: ApiFixture[] = [];

  for (let i = 0; i < 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = toApiDate(d);

    try {
      const data = await apiFetch(`/football-get-matches-by-date?date=${dateStr}`);
      const matches: any[] = data?.response?.matches ?? [];
      const parsed = matches
        .map(m => parseMatch(m, leagueMap))
        .filter((f): f is ApiFixture => f !== null);

      console.log(`[football-api] ${dateStr}: ${parsed.length} matches`);
      results.push(...parsed);
    } catch (e: any) {
      console.warn(`[football-api] fetch ${dateStr} failed:`, e.message);
    }

    if (i < 2) await new Promise(r => setTimeout(r, 300));
  }

  // De-duplicate
  const seen = new Set<number>();
  return results.filter(f => {
    if (seen.has(f.fixtureId)) return false;
    seen.add(f.fixtureId);
    return true;
  });
}

/**
 * Probe endpoint — used by admin panel to verify API is working.
 */
export async function probeApiEndpoints(): Promise<{ path: string; status: string; count: number }[]> {
  const results: { path: string; status: string; count: number }[] = [];
  const dateStr = toApiDate(new Date());

  const paths = [
    `/football-get-matches-by-date?date=${dateStr}`,
    "/football-get-all-leagues",
  ];

  for (const path of paths) {
    try {
      const data = await apiFetch(path);
      const matches = data?.response?.matches ?? data?.response?.leagues ?? [];
      results.push({ path, status: "ok", count: Array.isArray(matches) ? matches.length : 0 });
    } catch (e: any) {
      results.push({ path, status: e.message.slice(0, 80), count: 0 });
    }
    await new Promise(r => setTimeout(r, 200));
  }

  return results;
}
