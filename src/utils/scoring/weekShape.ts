import { PlayerScore } from "../../types/RakMadnessScores";
import gameLabels, { LEAGUES } from "./gameColumns";
import { fillStatus } from "./getPickResults";
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
 * One walk per set of scores. The knockouts read the shape, the analysis dialog
 * reads it, and the search reads it again off the rows the knockouts returned. A
 * refresh asks the same question of the same rows more than once.
 */
const shapes = new WeakMap<Array<PlayerScore>, WeekShape>();

/**
 * What is left of a week, read column by column in one pass.
 *
 * A column is read across every row rather than off one. A row that left a game
 * blank scores it unscoreable rather than incomplete, so reading one row alone
 * would drop a game the leader happened to skip. A blank is the player's own
 * doing and says nothing about the game, so `fillStatus` is what decides a hole
 * here: it is the one unscoreable cell that leaves none.
 */
export default function weekShape(players: Array<PlayerScore>): WeekShape {
  const held = shapes.get(players);
  if (held != null) return held;
  const shape = readWeekShape(players);
  shapes.set(players, shape);
  return shape;
}

function readWeekShape(players: Array<PlayerScore>): WeekShape {
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
        } else if (fillStatus(cell) === "unscoreable") {
          isHole = true;
        }
        if (isOpen && isHole) break;
      }
      if (isOpen) {
        remaining.push({
          label: labels[index],
          league,
          cells: players.map((player) => {
            const cell = player[league][index];
            const text = cell.pick ?? "";
            // A pick nothing can score is worth what a blank is worth, whatever
            // team it names. Here that is a pick on a game the week's results do
            // not hold. A spread the sheet disagrees with itself about marks the
            // whole column unscoreable, which leaves nobody on it incomplete and
            // so leaves the game closed. This pick scores its player nothing
            // however the game falls, and read as a live pick it would put them
            // on a side they can never take.
            if (fillStatus(cell) === "unscoreable") {
              return { hasSpread: false, text };
            }
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
