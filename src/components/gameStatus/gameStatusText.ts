import { GameStatus } from "../../types/ESPN";
import { League } from "../../types/League";
import { LeagueResult } from "../../types/LeagueResult";
import { GameSpread } from "../../types/WeekGame";
import marginAgainstSpread from "../../utils/scoring/marginAgainstSpread";

/** Regulation is four quarters, and anything past them is overtime. */
const REGULATION_PERIODS = 4;

/**
 * What a game yet to kick off is doing, said in place of ESPN's own wording.
 *
 * ESPN says a scheduled game as its kickoff, in Eastern time. The strip under the
 * scoreline already says when the game starts, in the reader's own zone, so ESPN's
 * is the same fact twice and in the wrong zone for anyone outside the east.
 */
const PREGAME_DETAIL = "Pregame";

/**
 * How a game that finished level, or on its number, was scored. Both are a point for
 * everybody: the pool counts a tie as picking the winner, and a margin that lands on
 * the spread as covering it. Said in the word alone, because the scoreline above
 * marks both sides as having scored and would only be repeating itself here.
 */
const TIED = "Tied";
const PUSH = "Push";

/**
 * ESPN's own page for the game, where the drive chart and the box score this dialog
 * leaves out are.
 *
 * The league names itself in the path, and the enum already holds the word ESPN uses
 * for it, since the same value addresses the API the week is read from.
 */
export function gamecastUrl(league: League, id: string): string {
  return `https://www.espn.com/${league}/game/_/gameId/${id}`;
}

/**
 * When the game starts, as its own parts.
 *
 * Split rather than joined, because the stylesheet is what puts a dot between two
 * parts. Written into the strings instead, the dots inside a half would be spaced one
 * way and the dot between the halves another.
 *
 * Both parts are read off the one instant in whatever zone the reader is in, so a
 * late kickoff falls on the day it falls on for them. The zone is named because this
 * is now the only time the dialog shows, and a bare `1:00 PM` beside a game played
 * three zones away reads as ambiguous.
 */
export function kickoffParts(date: Date): Array<string> {
  return [
    date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }),
  ];
}

/** `OT` for the first period past regulation, `2OT` for the next, and so on. */
function overtimeLabel(period: number): string {
  const overtime = period - REGULATION_PERIODS;
  return overtime === 1 ? "OT" : `${overtime}OT`;
}

/** How many periods the game has scores for, overtime included. */
function periodsPlayed(result: LeagueResult): number {
  return Math.max(result.away.linescores.length, result.home.linescores.length);
}

/**
 * How the game stands, in the few characters the column between two scores holds.
 *
 * ESPN's own wording runs to `8:42 - 3rd Quarter`, which wraps to three lines there.
 * Said as `Q3 8:42` it fits on one, on a phone and on a desktop alike.
 */
export function detailText(result: LeagueResult): string {
  if (result.status === GameStatus.FINAL) {
    return periodsPlayed(result) > REGULATION_PERIODS ? "FT/OT" : "FT";
  }
  if (result.status === GameStatus.UPCOMING) {
    return PREGAME_DETAIL;
  }
  // Postponed, delayed, canceled: a stage the app has no short form for, so ESPN's
  // own word for it stands. Its wording of those carries no kickoff to repeat.
  if (result.status !== GameStatus.LIVE || result.period == null) {
    return result.detailMessage;
  }
  const period =
    result.period <= REGULATION_PERIODS
      ? `Q${result.period}`
      : overtimeLabel(result.period);
  // A clock reading zero is a period that has ended rather than one being played, and
  // saying so adds nothing to the period itself.
  return result.clock != null && !result.clock.startsWith("0:00")
    ? `${period} ${result.clock}`
    : period;
}

/** The other team in the game, which the line is only ever written against one of. */
function opponentOf(result: LeagueResult, team: string): string {
  return (
    [result.home, result.away]
      .map((side) => side.team.abbreviation)
      .find((abbreviation) => abbreviation !== team) ?? team
  );
}

/**
 * Which side a player had to pick to score the point, or nobody where everybody did.
 *
 * Against the line where the picks carried one, since that is what the week is scored
 * on, and on the game itself where they did not. Nobody on a tie or a push, which the
 * pool scores for everybody either way.
 *
 * The same question `getPickResults` asks of a player's own pick, over the same
 * `marginAgainstSpread`, read from the favored side rather than the picked one.
 */
export function scoringTeam(
  result: LeagueResult,
  spread?: GameSpread,
): string | undefined {
  if (spread == null) {
    return result.winner.team?.abbreviation;
  }
  // Read from the favored side, which is the side `weekGames` writes the line from.
  const margin = marginAgainstSpread(result, spread.team, spread.points);
  if (margin === 0) {
    return undefined;
  }
  return margin > 0 ? spread.team : opponentOf(result, spread.team);
}

/**
 * What the pool made of the game, said once it is over.
 *
 * Against the spread where the picks carried one, since that is what the week is
 * scored on, and on the game itself where they did not.
 */
export function outcomeText(result: LeagueResult, spread?: GameSpread): string {
  const scored = scoringTeam(result, spread);
  if (spread == null) {
    return scored != null ? `${scored} won` : TIED;
  }
  // Past tense, like `won` above it and the two lines below. The game is over by the
  // time any of them is said.
  return scored != null ? `${scored} covered` : PUSH;
}
