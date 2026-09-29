import { RakMadnessScores } from "../../types/RakMadnessScores";
import { getMustWin } from "./getPlayerAnalysis";
import { isWeekWon } from "./isWeekSettled";
import { formatPickDisplay } from "./parsePick";
import remainingGames from "./remainingGames";
import repeatedNames from "./repeatedNames";

/** One team in a game, and the players who are out if it fails to cover. */
export type SwingSide = {
  team: string;
  /** The first of these players' cells, as the tables show it. */
  pick: string;
  /** In ranking order. */
  players: Array<string>;
};

export type SwingGame = {
  label: string;
  name: string;
  /** Most players first. */
  sides: Array<SwingSide>;
};

export type SwingGames = {
  /** In column order, college then pro, the way the tables lay them out. */
  games: Array<SwingGame>;
};

export const NO_SWINGS: SwingGames = { games: [] };

/**
 * Each open game, with the players it knocks out whichever way it falls.
 *
 * Read off `getMustWin`, a verdict per pick per player, never the route search, so
 * it answers above `MAX_SEARCHED_GAMES` too.
 */
export default function getSwingGames(scores: RakMadnessScores): SwingGames {
  if (isWeekWon(scores)) return NO_SWINGS;

  const players = scores.scores;
  const repeated = repeatedNames(players);
  const open = remainingGames(players);
  const sidesByLabel = new Map<string, Map<string, SwingSide>>();

  for (const player of players) {
    if (player.status.isKnockedOut || repeated.has(player.name)) continue;
    for (const game of getMustWin(scores, player.name)) {
      let sides = sidesByLabel.get(game.label);
      if (sides == null) {
        sides = new Map();
        sidesByLabel.set(game.label, sides);
      }
      const side = sides.get(game.team);
      if (side == null) {
        sides.set(game.team, {
          team: game.team,
          pick: formatPickDisplay(game.pick),
          players: [player.name],
        });
      } else {
        side.players.push(player.name);
      }
    }
  }

  const games = open.flatMap((game): Array<SwingGame> => {
    const sides = sidesByLabel.get(game.label);
    if (sides == null) return [];
    return [
      {
        label: game.label,
        name:
          scores.games?.find((it) => it.label === game.label)?.name ??
          game.label,
        sides: [...sides.values()].sort(
          (a, b) => b.players.length - a.players.length,
        ),
      },
    ];
  });

  return { games };
}
