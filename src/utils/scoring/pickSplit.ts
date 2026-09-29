import { HomeAway } from "../../types/ESPN";
import { LeagueResult } from "../../types/LeagueResult";
import { PlayerScore } from "../../types/RakMadnessScores";
import { WeekGame } from "../../types/WeekGame";
import parsePick from "./parsePick";
import pickFor from "./pickFor";

/** How many players picked each side of a game. */
export type PickSplit = Readonly<Record<HomeAway, number>>;

/** A pick naming neither side, or a blank cell, counts for neither. */
export default function pickSplit(
  players: ReadonlyArray<PlayerScore>,
  game: WeekGame,
  result: LeagueResult,
): PickSplit {
  const split = { [HomeAway.HOME]: 0, [HomeAway.AWAY]: 0 };
  const home = result.home.team.abbreviation.toUpperCase();
  const away = result.away.team.abbreviation.toUpperCase();
  for (const player of players) {
    const cell = pickFor(player, game)?.pick;
    const team = cell != null ? parsePick(cell).teamAbbreviation : undefined;
    if (team === home) split[HomeAway.HOME] += 1;
    else if (team === away) split[HomeAway.AWAY] += 1;
  }
  return split;
}
