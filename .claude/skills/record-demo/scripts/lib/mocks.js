import XLSX from "xlsx-js-style";

/**
 * Builds a picks workbook the same shape `parsePicksWorkbook` expects: a
 * `Name` column plus one column per game label (`P1`, `C2`, ...), each cell
 * the team abbreviation picked. Leave a cell `""` to exercise the
 * "unscoreable" status.
 *
 * @param {Array<Record<string, string>>} rows
 * @returns {Buffer}
 */
export function buildPicksWorkbook(rows) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(rows),
    "Picks",
  );
  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
}

function team(abbr) {
  return {
    location: abbr,
    name: abbr,
    displayName: abbr,
    shortDisplayName: abbr,
    abbreviation: abbr,
  };
}

function competitor(abbr, homeAway, score) {
  return {
    id: abbr,
    homeAway,
    team: team(abbr),
    score: String(score),
    records: [{ type: "total", summary: "5-3" }],
    linescores: [],
  };
}

/**
 * One ESPN scoreboard event, in the shape `src/types/ESPN.ts` reads.
 *
 * @param {string} id
 * @param {string} homeAbbr
 * @param {string} awayAbbr
 * @param {number} homeScore
 * @param {number} awayScore
 * @param {"1"|"2"|"3"} statusId upcoming, live, or final (`GameStatus`)
 */
export function makeGame(
  id,
  homeAbbr,
  awayAbbr,
  homeScore,
  awayScore,
  statusId,
) {
  const detail =
    statusId === "3" ? "Final" : statusId === "2" ? "3rd Quarter" : "Scheduled";
  return {
    id,
    name: `${awayAbbr} at ${homeAbbr}`,
    shortName: `${awayAbbr} @ ${homeAbbr}`,
    date: "2024-10-06T17:00Z",
    competitions: [
      {
        competitors: [
          competitor(homeAbbr, "home", homeScore),
          competitor(awayAbbr, "away", awayScore),
        ],
        date: "2024-10-06T17:00Z",
        venue: { address: { city: "Kansas City", state: "MO" } },
        neutralSite: false,
      },
    ],
    status: {
      period: statusId === "2" ? 3 : undefined,
      displayClock: statusId === "2" ? "8:42" : undefined,
      type: { id: statusId, shortDetail: detail },
    },
  };
}

/** One season's worth of weeks, for the calendar endpoint. Dates are arbitrary. */
export function weekEntries(count) {
  const entries = [];
  const start = new Date("2024-09-05T00:00:00Z");
  for (let i = 1; i <= count; i++) {
    const s = new Date(start.getTime() + (i - 1) * 7 * 86400000);
    const e = new Date(s.getTime() + 6 * 86400000);
    entries.push({
      label: `Week ${i}`,
      alternateLabel: `Wk ${i}`,
      detail: `Week ${i}`,
      value: String(i),
      startDate: s.toISOString(),
      endDate: e.toISOString(),
    });
  }
  return entries;
}

/**
 * The calendar-only response (a `?dates=` query, no `week`): what
 * `getLeagueInfo`/`getRegularSeasonWeekCount` read. `slug` is `"nfl"` or
 * `"college-football"`, the `League` enum's own values.
 */
export function calendarJson(slug, weeksCount) {
  return {
    leagues: [
      {
        slug,
        season: { year: 2024 },
        calendar: [
          {
            value: "2",
            startDate: "2024-09-05T00:00Z",
            endDate: "2025-01-05T00:00Z",
            entries: weekEntries(weeksCount),
          },
        ],
      },
    ],
  };
}

/**
 * Routes this app's own network calls to fixture data, so its real component
 * tree (`AppDataContextProvider` down) renders against mocked picks and ESPN
 * data instead of the network. Matches the exact request shapes
 * `functions/api/picks/**`, `src/utils/getLeagueInfo.ts`, and
 * `src/utils/getLeagueResults.ts` make; keep this in step with those if their
 * URLs or query params change.
 *
 * @param {import("playwright").BrowserContext} context
 * @param {{
 *   season: number,
 *   week: number,
 *   xlsxBuffer: Buffer,
 *   events: () => { events: Array<unknown> },
 *   collegeEvents?: () => { events: Array<unknown> },
 * }} options `events`/`collegeEvents` are called fresh on every request, so a
 *   scenario can flip a closed-over flag (e.g. a game going final) and have
 *   the next poll see it, without re-registering the route.
 */
export async function registerAppMocks(
  context,
  { season, week, xlsxBuffer, events, collegeEvents = () => ({ events: [] }) },
) {
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;

    if (pathname === "/api/picks") {
      return route.fulfill({ json: { seasons: [season] } });
    }
    if (pathname === `/api/picks/${season}/${week}`) {
      return route.fulfill({
        body: xlsxBuffer,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    }
    if (pathname.includes("/apis/site/v2/sports/football/")) {
      const isCollege = pathname.includes("college-football");
      if (!url.searchParams.has("week")) {
        return route.fulfill({
          json: calendarJson(
            isCollege ? "college-football" : "nfl",
            isCollege ? 15 : 18,
          ),
        });
      }
      return route.fulfill({ json: isCollege ? collegeEvents() : events() });
    }
    return route.continue();
  });
}
