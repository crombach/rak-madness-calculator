import {
  MondayNightOutlook,
  PlayerAnalysis,
  RemainingPick,
  VictoryRoute,
  WaysThrough,
} from "../../types/PlayerAnalysis";
import { PlayerScore, RakMadnessScores } from "../../types/RakMadnessScores";
import { compareOnMerit, Merit } from "./comparePlayerScores";
import isWinnerDecided from "./isWinnerDecided";
import remainingGames, { RemainingGame } from "./remainingGames";
import repeatedNames from "./repeatedNames";

/**
 * The most games still to play the routes are worked out for. Only the contested
 * ones are searched, and only the sets of those holding no winner are read, so this
 * is a loose ceiling rather than a count of anything.
 *
 * Set by what a phone can hold the thread for, since the search holds it while it
 * runs. `scoring.bench.ts` measures a move of this number, and at sixteen the worst
 * week `benchFixtures` builds answers in about 13ms in Chromium on an M-series
 * laptop. The same week under CPU throttling, which is how a phone is read from a
 * laptop, answers in 56ms at 4x and 141ms at 10x. A week above the ceiling still
 * names its must-win games, which `provenMustWin` reads without a search.
 */
export const MAX_SEARCHED_GAMES = 16;

/**
 * How many routes are carried before the rest are only counted. Twice what
 * `AnalysisRoutes` holds open, so the button under them opens one more set of
 * the same size rather than a tail of any length.
 */
const MAX_LISTED_ROUTES = 6;

/**
 * One tier of one player's score, as the outcome moves it.
 *
 * `base` is where the tier lands with no bit set, and every bit of `plus` the
 * outcome sets is worth a point on top while every bit of `minus` it sets costs
 * one. A game the player takes either way is worth the same both directions, so it
 * sits in `base` and in neither mask, and the reading costs two popcounts rather
 * than one per direction.
 */
type Tier = { base: number; plus: number; minus: number };

/** A tier as one outcome leaves it. */
function scoreIn(tier: Tier, outcome: number): number {
  return (
    tier.base + bitCount(tier.plus & outcome) - bitCount(tier.minus & outcome)
  );
}

/**
 * `set` names the games this player takes when the bit falls one way and `clear`
 * the ones they take when it falls the other, which the two masks below restate as
 * a floor and the bits that move it.
 */
function tierOf(set: number, clear: number, current: number): Tier {
  return {
    base: current + bitCount(clear),
    plus: set & ~clear,
    minus: clear & ~set,
  };
}

/** One player's week, in the three tiers the ranking reads. */
type Side = {
  player: PlayerScore;
  total: Tier;
  college: Tier;
  spread: Tier;
};

type Verdict =
  | { kind: "loss" }
  | { kind: "win" }
  /** Level on points, so the Monday night total between `lo` and `hi` decides it. */
  | { kind: "onTotal"; lo: number; hi: number };

const LOSS: Verdict = { kind: "loss" };
const WIN: Verdict = { kind: "win" };

/**
 * Set bits in a 32-bit word, in five steps whatever the word holds. The search
 * reads one per tier per player per outcome, so a cost that grows with the games a
 * player picked is a cost the widest week pays most.
 */
function bitCount(value: number): number {
  let bits = value - ((value >>> 1) & 0x55555555);
  bits = (bits & 0x33333333) + ((bits >>> 2) & 0x33333333);
  bits = (bits + (bits >>> 4)) & 0x0f0f0f0f;
  return Math.imul(bits, 0x01010101) >>> 24;
}

/** What each way the games can fall is worth to one player. */
function sideFor(
  player: PlayerScore,
  playerIndex: number,
  contested: Array<RemainingGame>,
  coverers: Array<string>,
): Side {
  let setTotal = 0;
  let clearTotal = 0;
  let setCollege = 0;
  let clearCollege = 0;
  let setSpread = 0;
  let clearSpread = 0;
  contested.forEach((game, bit) => {
    const cell = game.cells[playerIndex];
    // A cell nobody filled in scores its player nothing whichever way the game
    // falls, so it belongs to neither side of the tier.
    if (cell.team == null) return;
    const mask = 1 << bit;
    const covers = cell.team === coverers[bit];
    if (game.league === "college") {
      if (covers) setCollege |= mask;
      else clearCollege |= mask;
    } else if (cell.hasSpread) {
      // Pro against the spread is a tiebreaker tier of its own, and counts only
      // the pro games that carry a spread.
      if (covers) setSpread |= mask;
      else clearSpread |= mask;
    }
    if (covers) setTotal |= mask;
    else clearTotal |= mask;
  });
  return {
    player,
    total: tierOf(setTotal, clearTotal, player.score.total),
    college: tierOf(setCollege, clearCollege, player.score.college),
    spread: tierOf(setSpread, clearSpread, player.score.proAgainstTheSpread),
  };
}

/**
 * The most this rival can finish ahead of the player on points, over every way the
 * games can fall. Every game the rival takes and the player does not widens it, and
 * none the other way does.
 */
function leadCeiling(me: Tier, rival: Tier): number {
  let most = 0;
  // Only where the rival gains or the player loses can a game widen the lead.
  for (let bits = rival.plus | me.minus; bits !== 0; bits &= bits - 1) {
    const bit = bits & -bits;
    const step =
      ((rival.plus & bit) !== 0 ? 1 : 0) -
      ((rival.minus & bit) !== 0 ? 1 : 0) -
      ((me.plus & bit) !== 0 ? 1 : 0) +
      ((me.minus & bit) !== 0 ? 1 : 0);
    if (step > 0) most += step;
  }
  return rival.base - me.base + most;
}

/**
 * The rivals a reading has to measure against, most dangerous first.
 *
 * A rival who cannot draw level however the week falls decides nothing, and the
 * rest are ordered so an outcome the player loses is answered on the first rival
 * rather than the last.
 */
function threats(me: Side, rivals: Array<Side>): Array<Side> {
  return rivals
    .map((rival) => ({ rival, ceiling: leadCeiling(me.total, rival.total) }))
    .filter((it) => it.ceiling >= 0)
    .sort((a, b) => b.ceiling - a.ceiling)
    .map((it) => it.rival);
}

/** What the ranking reads off this player, as one outcome leaves them. */
function meritIn(side: Side, total: number, outcome: number): Merit {
  return {
    hasNoPicks: side.player.status.hasNoPicks,
    hasBlankPick: side.player.status.hasBlankPick,
    total,
    distance: side.player.tiebreaker.distance,
    college: scoreIn(side.college, outcome),
    proAgainstTheSpread: scoreIn(side.spread, outcome),
  };
}

/**
 * Whether one outcome takes the week, and on what.
 *
 * Winning means finishing level with everyone or better. `applyKnockouts` leaves a
 * genuine tie standing and calls both players the winner, so this does too.
 *
 * Where the Monday night game is still to be played nobody has a distance yet, so a
 * dead heat on points is answered as the totals that would win it. The player is
 * closer than a rival on every total on their side of the midpoint between the two
 * guesses. An exact midpoint is a dead heat on Monday night as well, and falls to
 * the tiers below it, which is what `midpointWins` reads.
 */
function evaluate(
  me: Side,
  rivals: Array<Side>,
  outcome: number,
  isMondayNightSettled: boolean,
): Verdict {
  const myTotal = scoreIn(me.total, outcome);
  let lo = 0;
  let hi = Number.POSITIVE_INFINITY;
  let isLevel = false;
  // Read on the first rival to draw level, since the tiers under the total decide
  // nothing anywhere else and most outcomes leave nobody level.
  let myMerit: Merit | undefined;

  for (const rival of rivals) {
    const theirTotal = scoreIn(rival.total, outcome);
    if (theirTotal > myTotal) return LOSS;
    if (theirTotal < myTotal) continue;

    myMerit ??= meritIn(me, myTotal, outcome);
    const mine = me.player.tiebreaker.pick;
    const theirs = rival.player.tiebreaker.pick;
    const behindOnLowerTiers =
      compareOnMerit(myMerit, meritIn(rival, theirTotal, outcome)) > 0;
    if (
      isMondayNightSettled ||
      mine == null ||
      theirs == null ||
      mine === theirs
    ) {
      // Monday night cannot separate them, or it already has, so the tiers
      // `compareOnMerit` runs decide it.
      if (behindOnLowerTiers) return LOSS;
      continue;
    }

    isLevel = true;
    const midpoint = (mine + theirs) / 2;
    const midpointWins = Number.isInteger(midpoint) && !behindOnLowerTiers;
    if (mine < theirs) {
      hi = Math.min(hi, midpointWins ? midpoint : Math.ceil(midpoint) - 1);
    } else {
      lo = Math.max(lo, midpointWins ? midpoint : Math.floor(midpoint) + 1);
    }
  }

  if (lo > hi) return LOSS;
  return isLevel ? { kind: "onTotal", lo, hi } : WIN;
}

/**
 * The games no win can do without, proven one game at a time rather than searched.
 *
 * Winning one of your own picks never costs you ground. It adds a point in every
 * tier it touches and denies the rival who picked the other side, so the best a
 * player can do without a game is to win every other pick they made. A game is
 * must-win exactly when even that loses, which is one verdict per game where the
 * search reads one per subset of them.
 *
 * Empty rather than partial where it can prove nothing. That is a player who cannot
 * take the week even with every pick landing. A list this returns holds every
 * must-win game there is.
 */
function provenMustWin(
  mineMask: number,
  read: (outcome: number) => Verdict,
  contested: Array<RemainingGame>,
  playerIndex: number,
): Array<RemainingPick> {
  if (read(mineMask).kind === "loss") return [];
  return contested.flatMap((game, bit) => {
    const mask = 1 << bit;
    if ((mineMask & mask) === 0) return [];
    return read(mineMask & ~mask).kind === "loss"
      ? [{ label: game.label, pick: game.cells[playerIndex].text }]
      : [];
  });
}

function outlookOf(verdict: Verdict, isSettled: boolean): MondayNightOutlook {
  if (verdict.kind !== "onTotal") {
    return isSettled ? { kind: "settled" } : { kind: "notNeeded" };
  }
  return {
    kind: "range",
    min: verdict.lo > 0 ? verdict.lo : undefined,
    max: Number.isFinite(verdict.hi) ? verdict.hi : undefined,
  };
}

function sameOutlook(a: MondayNightOutlook, b: MondayNightOutlook): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind !== "range" || b.kind !== "range") return true;
  return a.min === b.min && a.max === b.max;
}

function combinations(count: number, size: number): number {
  let total = 1;
  for (let step = 0; step < size; step++) {
    total = (total * (count - step)) / (step + 1);
  }
  return total;
}

function picksIn(
  mask: number,
  contested: Array<RemainingGame>,
  playerIndex: number,
): Array<RemainingPick> {
  return contested
    .map((game, bit) =>
      (mask & (1 << bit)) === 0
        ? null
        : { label: game.label, pick: game.cells[playerIndex].text },
    )
    .filter((pick) => pick != null);
}

/** Carries the reason `applyKnockouts` already wrote, rather than writing another. */
function knockedOut(player: PlayerScore): PlayerAnalysis {
  return {
    kind: "knockedOut",
    player: player.name,
    explanation: player.status.explanation,
  };
}

type Route = { hits: number; verdict: Verdict };

type Search = {
  /** The fewest-game ways to win the week, level with everyone or better. */
  minimal: Array<Route>;
  /** The same, for the ways that win it alone. Empty where no set of picks does. */
  outright: Array<Route>;
};

/**
 * Whether a set one game smaller already won, which makes this one redundant.
 *
 * Any winning set has a one-game-smaller winning subset, already read, so dropping
 * one bit at a time is the whole test. `won` is read per list, since a set that only
 * draws level makes a bigger set redundant for the first list and not for the second.
 */
function hasWinningSubset(won: Uint8Array, hits: number): boolean {
  for (let bits = hits; bits !== 0; bits &= bits - 1) {
    if (won[hits ^ (bits & -bits)] === 1) return true;
  }
  return false;
}

/**
 * Every set one game larger than an open one, with every game inside it open too.
 *
 * A set holding an open set of its own size less one is a set nothing inside it has
 * settled yet, and every other set of this size is a set the search already has its
 * answer for. Ascending, which is the order the routes are reported in.
 */
function grownFrom(
  previous: Array<number>,
  open: Uint8Array,
  reached: Uint8Array,
  mineMask: number,
): Array<number> {
  const grown: Array<number> = [];
  reached.fill(0);
  for (const hits of previous) {
    if (open[hits] === 0) continue;
    for (let rest = mineMask & ~hits; rest !== 0; rest &= rest - 1) {
      const candidate = hits | (rest & -rest);
      if (reached[candidate] === 1) continue;
      reached[candidate] = 1;
      let isOpen = true;
      for (let bits = candidate; bits !== 0; bits &= bits - 1) {
        if (open[candidate ^ (bits & -bits)] === 0) {
          isOpen = false;
          break;
        }
      }
      if (isOpen) grown.push(candidate);
    }
  }
  return grown.sort((a, b) => a - b);
}

/**
 * The sets of the player's own picks that take the week, each one minimal, read
 * fewest games first.
 *
 * Winning a game you picked never costs you ground. It adds a point in every tier
 * it touches and denies the rival who picked the other side, so a set that takes the
 * week still takes it once another win is added. That leaves only the sets holding
 * no winner worth reading, and those are grown a game at a time off the ones that
 * lost rather than counted out of all `2^n` of them.
 *
 * `seekOutright` keeps reading past a set that only draws level, since a bigger set
 * can win outright where the one inside it cannot. Winning every pick is the best a
 * player can do, so it is only worth asking when that reads as an outright win,
 * which is what the caller hands in.
 */
function search(
  mineMask: number,
  verdictOf: (hits: number) => Verdict,
  seekOutright: boolean,
): Search {
  const minimal: Array<Route> = [];
  const outright: Array<Route> = [];
  // Marked where a set is read and leaves the sets above it still to answer for.
  const open = new Uint8Array(mineMask + 1);
  const won = new Uint8Array(mineMask + 1);
  // Its own record, because a set that only draws level rules a bigger set out of
  // `minimal` and leaves it the smallest way to take the week alone.
  const wonOutright = new Uint8Array(mineMask + 1);
  const reached = new Uint8Array(mineMask + 1);
  let candidates = [0];

  while (candidates.length > 0) {
    for (const hits of candidates) {
      const verdict = verdictOf(hits);
      const { kind } = verdict;
      if (kind !== "loss") {
        if (!hasWinningSubset(won, hits)) minimal.push({ hits, verdict });
        won[hits] = 1;
        if (kind === "win") {
          if (!hasWinningSubset(wonOutright, hits)) {
            outright.push({ hits, verdict });
          }
          wonOutright[hits] = 1;
          continue;
        }
        if (!seekOutright) continue;
      }
      open[hits] = 1;
    }
    candidates = grownFrom(candidates, open, reached, mineMask);
  }
  return { minimal, outright };
}

type RouteShape = Pick<
  Extract<PlayerAnalysis, { kind: "paths" }>,
  "mustWin" | "pool" | "routes" | "hiddenRouteCount" | "mondayNight"
>;

/** The games every route needs, and the ways past them: one pool, or a list. */
function reduceRoutes(
  minimal: Array<Route>,
  contested: Array<RemainingGame>,
  playerIndex: number,
  isMondayNightSettled: boolean,
): RouteShape {
  const mustWinMask = minimal.reduce(
    (shared, route) => shared & route.hits,
    minimal[0].hits,
  );
  const mustWin = picksIn(mustWinMask, contested, playerIndex);
  const rests = minimal.map((route) => ({
    mask: route.hits & ~mustWinMask,
    outlook: outlookOf(route.verdict, isMondayNightSettled),
  }));
  const isOneOutlook = rests.every((rest) =>
    sameOutlook(rest.outlook, rests[0].outlook),
  );
  const sizes = new Set(rests.map((rest) => bitCount(rest.mask)));
  const poolMask = rests.reduce((all, rest) => all | rest.mask, 0);
  const choose = bitCount(rests[0].mask);
  // Every way of choosing that many of the pool is a route only when there are as
  // many routes as there are ways, since each route is a different one of them.
  const isPool =
    isOneOutlook &&
    sizes.size === 1 &&
    rests.length === combinations(bitCount(poolMask), choose);

  if (isPool) {
    return {
      mustWin,
      pool:
        choose > 0
          ? { choose, games: picksIn(poolMask, contested, playerIndex) }
          : undefined,
      hiddenRouteCount: 0,
      mondayNight: rests[0].outlook,
    };
  }

  // Fewest games first, so the routes asking least of the player are the ones kept
  // and the ones shown before the rest are unfolded.
  const routes: Array<VictoryRoute> = rests
    .map((rest) => ({
      games: picksIn(rest.mask, contested, playerIndex),
      mondayNight: rest.outlook,
    }))
    .sort((a, b) => a.games.length - b.games.length);
  return {
    mustWin,
    routes: routes.slice(0, MAX_LISTED_ROUTES),
    hiddenRouteCount: Math.max(0, routes.length - MAX_LISTED_ROUTES),
    mondayNight: isOneOutlook ? rests[0].outlook : undefined,
  };
}

/**
 * The same blocks without the tiebreaker line. Every route that takes the week alone
 * does so whatever Monday night's total is, so an outlook here would say nothing.
 */
function outrightOnly(shape: RouteShape): WaysThrough {
  return {
    mustWin: shape.mustWin,
    pool: shape.pool,
    routes: shape.routes,
    hiddenRouteCount: shape.hiddenRouteCount,
  };
}

/**
 * The answer where the week already holds one, and undefined where the search below
 * is what has to find it.
 *
 * Split out so a caller can ask before it puts a progress bar up. Every branch here
 * is a walk of the players, which is why `getPlayerAnalysis` opens with the same
 * call rather than keeping two copies of them.
 *
 * A name the sheet does not hold answers undefined too. `getPlayerAnalysis` answers
 * the same undefined for it, so a caller falling through to the search on this needs
 * no third case.
 */
export function getSettledAnalysis(
  scores: RakMadnessScores,
  playerName: string,
): PlayerAnalysis | undefined {
  return settledAnalysis(scores, playerName)?.analysis;
}

type Settled = {
  playerIndex: number;
  player: PlayerScore;
  rivals: Array<{ player: PlayerScore; index: number }>;
  /** The answer the week already holds, absent where the search has to find it. */
  analysis?: PlayerAnalysis;
};

/**
 * Undefined where the sheet holds nobody by that name. Every branch is a walk of
 * the players, and `getPlayerAnalysis` reads the walks back off this rather than
 * repeating them.
 */
function settledAnalysis(
  scores: RakMadnessScores,
  playerName: string,
): Settled | undefined {
  const players = scores.scores;
  const playerIndex = players.findIndex((it) => it.name === playerName);
  if (playerIndex < 0) return undefined;

  const player = players[playerIndex];
  const clinched: PlayerAnalysis = { kind: "clinched", player: player.name };
  // Checked beside the knockout, since the search assumes every contested
  // game is a pick, and a caller's blank row may skip `applyKnockouts`.
  if (player.status.isKnockedOut || player.status.hasBlankPick) {
    return { playerIndex, player, rivals: [], analysis: knockedOut(player) };
  }

  // Nothing left to play means the knockouts settled it, and whoever they
  // left standing won, decided here since the search's tier order may differ.
  if (isWinnerDecided(scores)) {
    return { playerIndex, player, rivals: [], analysis: clinched };
  }

  // A knocked out player cannot take the week off anyone, so they are not measured
  // against. That is what keeps the search small late in a week.
  const rivals = liveRivals(players, playerIndex);
  if (rivals.length === 0) {
    return { playerIndex, player, rivals, analysis: clinched };
  }

  return { playerIndex, player, rivals };
}

/**
 * Everyone still able to take the week off this player.
 *
 * A row under a name two rows share is left out for the same reason
 * `applyKnockouts` leaves it out: the workbook is wrong about who that row is, so
 * it takes the week off nobody. Without this the analysis would name a threat the
 * tables say knocks nobody out.
 */
function liveRivals(
  players: RakMadnessScores["scores"],
  playerIndex: number,
): Array<{ player: RakMadnessScores["scores"][number]; index: number }> {
  const repeated = repeatedNames(players);
  return players
    .map((it, index) => ({ player: it, index }))
    .filter(
      (it) =>
        it.index !== playerIndex &&
        !it.player.status.isKnockedOut &&
        !repeated.has(it.player.name),
    );
}

/**
 * Where a player stands in a week, and what they still have to do to win it.
 *
 * Answers for every player, knocked out or not, and for a week already decided as
 * well as one being played. Undefined where the sheet holds nobody by that name,
 * which is the only way the question has no answer at all.
 *
 * A game of the player's own that lands on the line is read as their win alone. The
 * pool scores a push for both sides, so it also scores for the rival who picked the
 * other side, and a route named here can fall to that. Read the other way this
 * answers nothing. Winning every game they picked would leave the gap where it
 * started, so a player even a point back could never be told they are live. Every
 * other answer holds either way. A knockout and a must-win game only become more
 * true, and a clinch reads a week where none of the player's own picks land, which
 * is a week with no push in them to read.
 */
export default function getPlayerAnalysis(
  scores: RakMadnessScores,
  playerName: string,
): PlayerAnalysis | undefined {
  const settled = settledAnalysis(scores, playerName);
  if (settled == null) return undefined;
  if (settled.analysis != null) return settled.analysis;
  const { playerIndex, player, rivals } = settled;
  const players = scores.scores;

  const games = remainingGames(players);
  // A game every live player picked the same way moves all their scores together,
  // in the total and in both tiebreaker tiers, so it cannot change the order.
  const live = [playerIndex, ...rivals.map((it) => it.index)];
  const contested = games.filter(
    (game) => new Set(live.map((index) => game.cells[index].team)).size > 1,
  );

  // This player has no blank pick, handled above, so every contested game
  // is theirs to win. A rival's blank still scores no gain in `sideFor`.
  const coverers = contested.map((game) => game.cells[playerIndex].team!);
  const mineMask = (1 << contested.length) - 1;

  const isMondayNightSettled = scores.tiebreaker != null;

  const me = sideFor(player, playerIndex, contested, coverers);
  const against = threats(
    me,
    rivals.map((rival) =>
      sideFor(rival.player, rival.index, contested, coverers),
    ),
  );

  // Every outcome read below is a set of the player's own picks, so no two reads
  // ask about the same one and there is nothing for a cache to hold.
  const read = (outcome: number) =>
    evaluate(me, against, outcome, isMondayNightSettled);

  // Above the ceiling only the must-win games are answered, which cost a verdict
  // each rather than a search. What is left over is a count of wins, and a count
  // names no games, so there is nothing in it a reader could act on.
  if (games.length > MAX_SEARCHED_GAMES) {
    return {
      kind: "headline",
      player: player.name,
      mustWin: provenMustWin(mineMask, read, contested, playerIndex),
    };
  }

  // Winning every pick is the player's best case, so a loss there means no
  // smaller set saves them, without reading all `2^n` subsets to say so.
  const best = read(mineMask);
  if (best.kind === "loss") return knockedOut(player);

  const { minimal, outright } = search(mineMask, read, best.kind === "win");

  if (minimal.length === 0) {
    return knockedOut(player);
  }
  // Nothing left to win.
  if (
    minimal.length === 1 &&
    minimal[0].hits === 0 &&
    minimal[0].verdict.kind === "win"
  ) {
    return { kind: "clinched", player: player.name };
  }

  return {
    kind: "paths",
    player: player.name,
    ...reduceRoutes(minimal, contested, playerIndex, isMondayNightSettled),
    // Shaped like the ways above it, since it is the same question asked of a
    // higher bar. `mondayNight` is dropped: every route here wins without it.
    outright:
      outright.length > 0
        ? outrightOnly(
            reduceRoutes(
              outright,
              contested,
              playerIndex,
              isMondayNightSettled,
            ),
          )
        : undefined,
  };
}
