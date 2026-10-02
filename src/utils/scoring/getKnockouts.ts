import {
  PickResult,
  PlayerScore,
  RakMadnessScores,
  Tiebreaker,
} from "../../types/RakMadnessScores";
import applyKnockouts from "./applyKnockouts";
import comparePlayerScores from "./comparePlayerScores";
import gameLabels, { LEAGUES, LeagueKey } from "./gameColumns";
import { getMustWin } from "./getPlayerAnalysis";
import { hasOutcome, isWeekWon } from "./isWeekSettled";
import parsePick, { formatPickDisplay } from "./parsePick";
import remainingGames from "./remainingGames";
import repeatedNames from "./repeatedNames";
import weekShape from "./weekShape";
import {
  KnockoutGame,
  KnockoutGames,
  KnockoutSide,
  KnockoutTiebreaker,
} from "./knockoutTypes";

export type { KnockoutGame, KnockoutGames, KnockoutSide };

/** The tiers in the order `compareOnMerit` reads them. */
const TIEBREAK_ORDER: ReadonlyArray<Tiebreaker> = [
  "mnfPoints",
  "college",
  "proAgainstTheSpread",
];

type Column = { label: string; league: LeagueKey; index: number };

/** Every picks column, in table order. */
function columnsOf(players: Array<PlayerScore>): Array<Column> {
  const [first] = players;
  if (first == null) return [];
  return LEAGUES.flatMap((league) =>
    gameLabels(first, league).map((label, index) => ({ label, league, index })),
  );
}

/** Each side every live player must win, by game, then by team. */
function mustWinSides(
  scores: RakMadnessScores,
): Map<string, Map<string, KnockoutSide>> {
  const players = scores.scores;
  const repeated = repeatedNames(players);
  const sidesByLabel = new Map<string, Map<string, KnockoutSide>>();

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
  return sidesByLabel;
}

/** The pick as it stood before its game was final. */
function reopenPick(cell: PickResult): PickResult {
  return hasOutcome(cell.status) ? { ...cell, status: "incomplete" } : cell;
}

/** The player with no verdict, as the walk below starts them. */
function withoutVerdict(player: PlayerScore): PlayerScore {
  return {
    ...player,
    status: {
      hasNoPicks: player.status.hasNoPicks,
      isKnockedOut: player.status.hasNoPicks,
    },
  };
}

/** The player with no MNF Points result, once the game that settles it reopens. */
function withoutTiebreaker(player: PlayerScore): PlayerScore {
  return { ...player, tiebreaker: { pick: player.tiebreaker.pick } };
}

/** The player with one more final game played again, as if still to come. */
function reopened(player: PlayerScore, { league, index }: Column): PlayerScore {
  const cell = player[league][index];
  const score = { ...player.score };
  if (cell.status === "yes") {
    score.total -= 1;
    score[league] -= 1;
    if (league === "pro" && parsePick(cell.pick).spread !== 0) {
      score.proAgainstTheSpread -= 1;
    }
  }
  const picks = [...player[league]];
  picks[index] = reopenPick(cell);
  return { ...player, [league]: picks, score };
}

/** Each player's standing, by name. Only those in `asked` are judged. */
function standingOf(
  players: Array<PlayerScore>,
  tiebreakerScore: number | undefined,
  asked: ReadonlySet<string>,
): Map<string, PlayerScore["status"]> {
  return statusByName(
    applyKnockouts(
      [...players].sort(comparePlayerScores),
      tiebreakerScore,
      asked,
    ),
  );
}

function statusByName(
  players: Array<PlayerScore>,
): Map<string, PlayerScore["status"]> {
  return new Map(players.map((player) => [player.name, player.status]));
}

const isStanding = (
  statuses: Map<string, PlayerScore["status"]>,
  name: string,
): boolean => statuses.get(name)?.isKnockedOut === false;

/**
 * When a game ended, for the order its knockouts are credited in. Its kickoff
 * stands in where ESPN gave no finish.
 */
function finishOf(scores: RakMadnessScores, label: string): number {
  const result = scores.games?.find((game) => game.label === label)?.result;
  const finish = (result?.finishedAt ?? result?.date)?.getTime();
  return finish != null && Number.isFinite(finish)
    ? finish
    : Number.POSITIVE_INFINITY;
}

/**
 * Each final game that knocked someone out, with the side they picked.
 *
 * The final games are played back in the order they ended, table order among
 * those ending together. A game that ends later never moves an earlier credit. A player standing before a game and out after it is that
 * game's, so a player two games could each have knocked out is credited to the
 * first of them. A knockout that came down to a tiebreaker goes under its tier,
 * whatever the pick did. Any other is behind on total, and goes under the pick,
 * so one on a game the player left blank names no side.
 *
 * One pass of the knockouts per final game, not a must-win verdict per player per
 * game, which is too slow on a busy Sunday. Reopening a game only ever gives a
 * player more ways to win, so one standing after a game stood before it too. Each
 * pass judges only the players still out, and the walk ends once none are.
 */
function knockoutSides(scores: RakMadnessScores): {
  sidesByLabel: Map<string, Map<string, KnockoutSide>>;
  tiebreakersByLabel: Map<string, Map<Tiebreaker, KnockoutTiebreaker>>;
} {
  const players = scores.scores;
  const { remaining, unscoreable } = weekShape(players);
  const isClosed = new Set([
    ...remaining.map((game) => game.label),
    ...unscoreable,
  ]);
  const finals = columnsOf(players)
    .filter(({ label }) => !isClosed.has(label))
    .map((column, order) => ({
      column,
      order,
      finish: finishOf(scores, column.label),
    }))
    .sort((a, b) => a.finish - b.finish || a.order - b.order)
    .map(({ column }) => column);

  const repeated = repeatedNames(players);
  const sidesByLabel = new Map<string, Map<string, KnockoutSide>>();
  const tiebreakersByLabel = new Map<
    string,
    Map<Tiebreaker, KnockoutTiebreaker>
  >();
  let after = statusByName(players);
  // Never credited to a game: one with no picks is out before any of them, and
  // a repeated name is nobody the page can point to.
  let stillOut = new Set(
    players
      .filter(
        ({ name, status }) =>
          !status.hasNoPicks && !repeated.has(name) && !isStanding(after, name),
      )
      .map(({ name }) => name),
  );
  // The MNF Points are scored off the sheet's last game, the one before its `Pts`
  // column, which need not kick off last. They hold until that game reopens.
  const pointsGame = columnsOf(players).at(-1)?.label;
  let tiebreakerScore = scores.tiebreaker;
  // Every final game from `at` on, played again.
  let replayed = players.map(withoutVerdict);
  for (let at = finals.length - 1; at >= 0 && stillOut.size > 0; at--) {
    const { label, league, index } = finals[at];
    replayed = replayed.map((player) => reopened(player, finals[at]));
    if (label === pointsGame) {
      tiebreakerScore = undefined;
      replayed = replayed.map(withoutTiebreaker);
    }
    const before = standingOf(replayed, tiebreakerScore, stillOut);
    for (const player of players) {
      const cell = player[league][index];
      if (
        !stillOut.has(player.name) ||
        !isStanding(before, player.name) ||
        !hasOutcome(cell.status)
      ) {
        continue;
      }
      const tiebreaker = after.get(player.name)?.tiebreaker;
      if (tiebreaker) {
        let tiers = tiebreakersByLabel.get(label);
        if (tiers == null) {
          tiers = new Map();
          tiebreakersByLabel.set(label, tiers);
        }
        let tier = tiers.get(tiebreaker);
        if (tier == null) {
          tier = { tiebreaker, players: [] };
          tiers.set(tiebreaker, tier);
        }
        tier.players.push(player.name);
        continue;
      }
      const { teamAbbreviation: team } = parsePick(cell.pick);
      if (team == null) continue;
      let sides = sidesByLabel.get(label);
      if (sides == null) {
        sides = new Map();
        sidesByLabel.set(label, sides);
      }
      let side = sides.get(team);
      if (side == null) {
        side = { team, pick: cell.pick, players: [] };
        sides.set(team, side);
      }
      side.players.push(player.name);
    }
    after = before;
    stillOut = new Set(
      [...stillOut].filter((name) => !isStanding(after, name)),
    );
  }
  return { sidesByLabel, tiebreakersByLabel };
}

/**
 * Each open game someone must win, with the players it knocks out whichever way
 * it falls, and each final game with the players it knocked out.
 *
 * The open games are read off `getMustWin`, a verdict per pick per player, never
 * the route search, so they answer above `MAX_SEARCHED_GAMES` too.
 */
export default function getKnockouts(scores: RakMadnessScores): KnockoutGames {
  const open = new Set(remainingGames(scores.scores).map((game) => game.label));
  const knockouts = knockoutSides(scores);
  const sidesByLabel = new Map([
    // A won week's open games can knock no one else out.
    ...(isWeekWon(scores) ? [] : mustWinSides(scores)),
    ...knockouts.sidesByLabel,
  ]);

  const games = columnsOf(scores.scores).flatMap(
    ({ label }): Array<KnockoutGame> => {
      const sides = sidesByLabel.get(label) ?? new Map<string, KnockoutSide>();
      const tiers = knockouts.tiebreakersByLabel.get(label);
      if (sides.size === 0 && tiers == null) return [];
      const weekGame = scores.games?.find((it) => it.label === label);
      const away = weekGame?.result?.away.team.abbreviation;
      const isAway = (side: KnockoutSide) => Number(side.team === away);
      return [
        {
          label,
          name: weekGame?.name ?? label,
          isFinal: !open.has(label),
          sides: [...sides.values()].sort(
            (a, b) =>
              isAway(b) - isAway(a) || b.players.length - a.players.length,
          ),
          ...(tiers && {
            tiebreakers: [...tiers.values()].sort(
              (a, b) =>
                TIEBREAK_ORDER.indexOf(a.tiebreaker) -
                TIEBREAK_ORDER.indexOf(b.tiebreaker),
            ),
          }),
        },
      ];
    },
  );

  return { games };
}
