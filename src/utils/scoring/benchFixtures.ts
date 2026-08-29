import {
  EspnCompetitor,
  EspnEvent,
  GameStatus,
  HomeAway,
} from "../../types/ESPN";
import { League, SeasonType, WeekInfo } from "../../types/League";
import { LeagueResult } from "../../types/LeagueResult";
import { toLeagueResult } from "../getLeagueResults";

/**
 * The size a real week runs to, taken from the shape `SkeletonTable` draws: six
 * college games and thirteen pro, played by a field past sixty.
 */
export const BENCH_PLAYERS = 60;
export const BENCH_COLLEGE_GAMES = 6;
export const BENCH_PRO_GAMES = 13;

/**
 * How far through the week the fixture stands. `kickoff` has every game ahead,
 * `sundayNight` leaves one live and one ahead, and `settled` is the finished week.
 */
export type WeekPhase = "kickoff" | "sundayNight" | "settled";

// Fixed, or a run cannot be compared against the one before it.
const SEASON = 2024;
const WEEK_START = new Date("2024-10-03T00:00:00Z");
const KICKOFF = new Date("2024-10-06T17:00:00Z");

export const BENCH_WEEK: WeekInfo = {
  value: 5,
  label: "Week 5",
  startDate: WEEK_START,
  endDate: new Date("2024-10-09T00:00:00Z"),
};

/**
 * College fans out over two groups at `limit=400`, so a week's answer can carry
 * hundreds of games this week's picks name none of. The filler is what makes the
 * matchup walk in `getLeagueResults` cost what it costs in a browser.
 */
const COLLEGE_FILLER_GAMES = 794;

function gameId(league: League, index: number): string {
  const prefix = league === League.COLLEGE ? "C" : "P";
  return `${prefix}${String(index + 1).padStart(2, "0")}`;
}

function homeTeam(id: string): string {
  return `${id}H`;
}

function awayTeam(id: string): string {
  return `${id}A`;
}

/**
 * One spread per game, read from the home side. `validateSpreads` flags a column
 * whose rows disagree, and a flagged column never reaches the branch under test.
 */
function homeSpread(league: League, index: number): number {
  const steps = [-3.5, 7, -1.5, 10.5, -6, 2.5, -13.5];
  return league === League.COLLEGE
    ? steps[index % steps.length]
    : -steps[index % steps.length];
}

/** The cell one player writes for one game, or undefined where they skipped it. */
function pickCell(
  league: League,
  gameIndex: number,
  playerIndex: number,
): string | undefined {
  // Home, away, blank, so a run covers the matched pick, the opposed one, and the
  // missing-pick branch the knockouts read.
  const side = (playerIndex + gameIndex) % 3;
  if (side === 2) return undefined;
  const id = gameId(league, gameIndex);
  const spread = homeSpread(league, gameIndex);
  return side === 0
    ? `${homeTeam(id)} ${spread > 0 ? "+" : ""}${spread}`
    : `${awayTeam(id)} ${spread > 0 ? "-" : "+"}${Math.abs(spread)}`;
}

/** Rows in the shape `sheet_to_json` returns, a skipped cell left out entirely. */
export function benchRows(): Array<Record<string, unknown>> {
  return Array.from({ length: BENCH_PLAYERS }, (_unused, playerIndex) => {
    const row: Record<string, unknown> = { Name: `Player ${playerIndex + 1}` };
    for (let game = 0; game < BENCH_COLLEGE_GAMES; game += 1) {
      const cell = pickCell(League.COLLEGE, game, playerIndex);
      if (cell != null) row[`C${game + 1}`] = cell;
    }
    for (let game = 0; game < BENCH_PRO_GAMES; game += 1) {
      const cell = pickCell(League.PRO, game, playerIndex);
      if (cell != null) row[`P${game + 1}`] = cell;
    }
    // Two rows leave the tiebreaker blank, so the missing-distance branch runs.
    if (playerIndex > 1) row.Pts = 40 + (playerIndex % 17);
    return row;
  });
}

export function benchHeader(): Array<string> {
  return [
    "Name",
    ...Array.from(
      { length: BENCH_COLLEGE_GAMES },
      (_unused, index) => `C${index + 1}`,
    ),
    ...Array.from(
      { length: BENCH_PRO_GAMES },
      (_unused, index) => `P${index + 1}`,
    ),
    "Pts",
  ];
}

/**
 * The rows as a real xlsx file, written through the library the app reads with, so
 * the measured parse is the one a published workbook gets.
 */
export async function benchPicksBuffer(): Promise<ArrayBuffer> {
  const XLSX = await import("xlsx-js-style");
  const sheet = XLSX.utils.json_to_sheet(benchRows(), {
    header: benchHeader(),
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Picks");
  const written: ArrayBuffer = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  });
  return written;
}

function statusAt(phase: WeekPhase, league: League, index: number): GameStatus {
  if (phase === "kickoff") return GameStatus.UPCOMING;
  if (phase === "settled") return GameStatus.FINAL;
  // One live and one ahead, which keeps the week open and the cache missing.
  if (league === League.PRO && index === BENCH_PRO_GAMES - 1) {
    return GameStatus.UPCOMING;
  }
  if (league === League.PRO && index === BENCH_PRO_GAMES - 2) {
    return GameStatus.LIVE;
  }
  return GameStatus.FINAL;
}

function competitor(
  abbreviation: string,
  homeAway: HomeAway,
  score: number,
): EspnCompetitor {
  return {
    id: `${abbreviation}-id`,
    homeAway,
    team: {
      location: abbreviation,
      name: abbreviation,
      displayName: abbreviation,
      shortDisplayName: abbreviation,
      abbreviation,
    },
    score: String(score),
    records: [{ type: "total", summary: "3-1" }],
    linescores: [{ value: 7 }, { value: 3 }, { value: 10 }, { value: 7 }],
  };
}

function event(
  id: string,
  home: string,
  away: string,
  status: GameStatus,
  date: Date,
): EspnEvent {
  // Home ahead by more than most of the spreads, so a week runs both the
  // against-the-spread branch and the plain win.
  const homeScore = status === GameStatus.UPCOMING ? 0 : 27;
  const awayScore = status === GameStatus.UPCOMING ? 0 : 20;
  return {
    id,
    name: `${away} at ${home}`,
    shortName: `${away} @ ${home}`,
    date: date.toISOString(),
    status: {
      period: status === GameStatus.UPCOMING ? undefined : 3,
      displayClock: status === GameStatus.LIVE ? "8:42" : undefined,
      type: {
        id: status,
        shortDetail: status === GameStatus.FINAL ? "Final" : "Sun, October 6th",
      },
    },
    competitions: [
      {
        date: date.toISOString(),
        competitors: [
          competitor(home, HomeAway.HOME, homeScore),
          competitor(away, HomeAway.AWAY, awayScore),
        ],
        venue: { address: { city: "Buffalo", state: "NY" } },
        neutralSite: false,
      },
    ],
  };
}

export function benchEvents(
  league: League,
  phase: WeekPhase,
): Array<EspnEvent> {
  const count =
    league === League.COLLEGE ? BENCH_COLLEGE_GAMES : BENCH_PRO_GAMES;
  const picked = Array.from({ length: count }, (_unused, index) => {
    const id = gameId(league, index);
    return event(
      id,
      homeTeam(id),
      awayTeam(id),
      statusAt(phase, league, index),
      new Date(KICKOFF.valueOf() + index * 3_600_000),
    );
  });
  if (league !== League.COLLEGE) return picked;

  // Named by no pick, so every one is walked and rejected.
  const filler = Array.from(
    { length: COLLEGE_FILLER_GAMES },
    (_unused, index) => {
      const id = `F${String(index).padStart(3, "0")}`;
      return event(
        id,
        `${id}H`,
        `${id}A`,
        GameStatus.FINAL,
        new Date(KICKOFF.valueOf() + (index % 48) * 3_600_000),
      );
    },
  );
  return [...picked, ...filler];
}

/** The week's games as the app models them, with no fetch and no cache. */
export function benchResults(phase: WeekPhase): {
  college: Array<LeagueResult>;
  pro: Array<LeagueResult>;
} {
  const map = (league: League) =>
    benchEvents(league, phase)
      .map(toLeagueResult)
      .filter((result): result is LeagueResult => result != null);
  return { college: map(League.COLLEGE), pro: map(League.PRO) };
}

/** The calendar answer `getRegularSeasonWeekCount` reads a week count from. */
function calendarBody(league: League) {
  const weeks = (count: number) =>
    Array.from({ length: count }, (_unused, index) => ({
      value: String(index + 1),
      label: `Week ${index + 1}`,
      startDate: new Date(
        WEEK_START.valueOf() + (index - 4) * 604_800_000,
      ).toISOString(),
      endDate: new Date(
        WEEK_START.valueOf() + (index - 3) * 604_800_000,
      ).toISOString(),
    }));
  return {
    leagues: [
      {
        slug: league as string,
        season: { year: SEASON },
        calendar: [
          {
            value: String(SeasonType.REGULAR),
            startDate: new Date("2024-09-01T00:00:00Z").toISOString(),
            endDate: new Date("2025-01-05T00:00:00Z").toISOString(),
            entries: weeks(league === League.COLLEGE ? 16 : 18),
          },
        ],
      },
    ],
  };
}

/**
 * A `fetch` answering the two ESPN endpoints scoring reaches, so a pass runs with
 * no network. A scoreboard request carries `week` and a calendar request does not.
 */
export function benchFetch(phase: WeekPhase): typeof fetch {
  return ((input: RequestInfo | URL) => {
    const url = String(input);
    const league = url.includes(League.COLLEGE) ? League.COLLEGE : League.PRO;
    const body = url.includes("week=")
      ? { events: benchEvents(league, phase) }
      : calendarBody(league);
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
    } as Response);
  }) as typeof fetch;
}
