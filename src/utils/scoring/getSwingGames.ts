import { RakMadnessScores } from "../../types/RakMadnessScores";
import { getMustWin } from "./getPlayerAnalysis";
import { isWeekWon } from "./isWeekSettled";
import { formatPickDisplay } from "./parsePick";
import remainingGames from "./remainingGames";
import repeatedNames from "./repeatedNames";
import { NO_SWINGS, SwingGame, SwingGames, SwingSide } from "./swingGameTypes";

export type { SwingGame, SwingGames, SwingSide };

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
    const weekGame = scores.games?.find((it) => it.label === game.label);
    const away = weekGame?.result?.away.team.abbreviation;
    const isAway = (side: SwingSide) => Number(side.team === away);
    return [
      {
        label: game.label,
        name: weekGame?.name ?? game.label,
        sides: [...sides.values()].sort(
          (a, b) =>
            isAway(b) - isAway(a) || b.players.length - a.players.length,
        ),
      },
    ];
  });

  return { games };
}
