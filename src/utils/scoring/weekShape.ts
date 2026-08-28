import { PlayerScore } from "../../types/RakMadnessScores";
import gameLabels, { LEAGUES } from "./gameColumns";
import { MISSING_PICK } from "./getPickResults";
import parsePick from "./parsePick";
import { RemainingGame } from "./remainingGames";

export type WeekShape = {
  /** The games still to be played, college first, then pro. */
  remaining: Array<RemainingGame>;
  /** The labels of the games nobody can be scored on, in the same order. */
  unscoreable: Array<string>;
  /** Every game played, and every one of them scoreable. */
  isEveryGameSettled: boolean;
};

const EMPTY: WeekShape = {
  remaining: [],
  unscoreable: [],
  isEveryGameSettled: false,
};

/**
 * What is left of a week, read column by column in one pass.
 *
 * A column is read across every row rather than off one. A row that left a game
 * blank scores it unscoreable rather than incomplete, so reading one row alone
 * would drop a game the leader happened to skip. A blank is the player's own
 * doing and says nothing about the game, which is why `MISSING_PICK` is the one
 * unscoreable header that leaves no hole in the week.
 */
export default function weekShape(players: Array<PlayerScore>): WeekShape {
  const [first] = players;
  if (first == null) return EMPTY;

  const remaining: Array<RemainingGame> = [];
  const unscoreable: Array<string> = [];
  LEAGUES.forEach((league) => {
    const labels = gameLabels(first, league);
    first[league].forEach((_unused, index) => {
      let isOpen = false;
      let isHole = false;
      for (const player of players) {
        const cell = player[league][index];
        if (cell.status === "incomplete") {
          isOpen = true;
        } else if (
          cell.status === "unscoreable" &&
          cell.explanation.header !== MISSING_PICK
        ) {
          isHole = true;
        }
        if (isOpen && isHole) break;
      }
      if (isOpen) {
        remaining.push({
          label: labels[index],
          league,
          cells: players.map((player) => {
            const text = player[league][index].pick ?? "";
            const { teamAbbreviation, spread } = parsePick(text);
            return { team: teamAbbreviation, hasSpread: spread !== 0, text };
          }),
        });
      }
      if (isHole) unscoreable.push(labels[index]);
    });
  });

  return {
    remaining,
    unscoreable,
    isEveryGameSettled: remaining.length === 0 && unscoreable.length === 0,
  };
}
