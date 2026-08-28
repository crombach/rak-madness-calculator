import {
  MondayNightOutlook,
  PlayerAnalysis,
  RemainingPick,
  UncontrolledGame,
  VictoryRoute,
} from "../../types/PlayerAnalysis";
import { PlayerScore, RakMadnessScores } from "../../types/RakMadnessScores";
import { comparePlayerScoresOnMerit } from "./comparePlayerScores";
import isWinnerDecided from "./isWinnerDecided";
import remainingGames, {
  pickDifference,
  RemainingGame,
} from "./remainingGames";

/**
 * The most games still to play the routes are worked out for. Only the contested
 * ones are searched, and the search doubles per one, so this is a loose ceiling.
 */
const MAX_SEARCHED_GAMES = 10;

/** How many routes are carried before the rest are only counted. */
const MAX_LISTED_ROUTES = 8;

/**
 * Where a player takes a point, as one bit per open game.
 *
 * A bit being set means the game's named team covered. Both directions are kept
 * because the other side of a game is worth a point to whoever picked it, so a
 * player's score has to be read off the outcome twice.
 */
type Gains = {
  setTotal: number;
  clearTotal: number;
  setCollege: number;
  clearCollege: number;
  setSpread: number;
  clearSpread: number;
};

const NO_GAINS: Gains = {
  setTotal: 0,
  clearTotal: 0,
  setCollege: 0,
  clearCollege: 0,
  setSpread: 0,
  clearSpread: 0,
};

type Verdict =
  | { kind: "loss" }
  | { kind: "win" }
  /** Level on points, so the Monday night total between `lo` and `hi` decides it. */
  | { kind: "onTotal"; lo: number; hi: number; rivals: Array<string> };

const LOSS: Verdict = { kind: "loss" };
const WIN: Verdict = { kind: "win" };

function bitCount(value: number): number {
  let count = 0;
  for (let bits = value; bits !== 0; bits &= bits - 1) {
    count += 1;
  }
  return count;
}

/** Every subset of `mask`, largest first, ending at zero. */
function subMasks(mask: number): Array<number> {
  const masks: Array<number> = [];
  for (let subset = mask; ; subset = (subset - 1) & mask) {
    masks.push(subset);
    if (subset === 0) break;
  }
  return masks;
}

function gainsFor(
  playerIndex: number,
  contested: Array<RemainingGame>,
  coverers: Array<string>,
): Gains {
  const gains = { ...NO_GAINS };
  contested.forEach((game, bit) => {
    const cell = game.cells[playerIndex];
    if (cell.team == null) return;
    const mask = 1 << bit;
    const scoresWhenSet = cell.team === coverers[bit];
    if (game.league === "college") {
      if (scoresWhenSet) gains.setCollege |= mask;
      else gains.clearCollege |= mask;
    } else if (cell.hasSpread) {
      // Pro against the spread is a tiebreaker tier of its own, and counts only
      // the pro games that carry a spread.
      if (scoresWhenSet) gains.setSpread |= mask;
      else gains.clearSpread |= mask;
    }
    if (scoresWhenSet) gains.setTotal |= mask;
    else gains.clearTotal |= mask;
  });
  return gains;
}

/** The player's score as the outcome leaves it, every open game counted. */
function projected(
  player: PlayerScore,
  gains: Gains,
  outcome: number,
): PlayerScore {
  const missed = ~outcome;
  const won = (set: number, clear: number) =>
    bitCount(set & outcome) + bitCount(clear & missed);
  const total = player.score.total + won(gains.setTotal, gains.clearTotal);
  const college =
    player.score.college + won(gains.setCollege, gains.clearCollege);
  return {
    ...player,
    score: {
      total,
      college,
      pro: total - college,
      proAgainstTheSpread:
        player.score.proAgainstTheSpread +
        won(gains.setSpread, gains.clearSpread),
    },
  };
}

type Rival = { player: PlayerScore; gains: Gains };

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
  player: PlayerScore,
  gains: Gains,
  rivals: Array<Rival>,
  outcome: number,
  isMondayNightSettled: boolean,
): Verdict {
  const me = projected(player, gains, outcome);
  let lo = 0;
  let hi = Number.POSITIVE_INFINITY;
  const level: Array<string> = [];

  for (const rival of rivals) {
    const them = projected(rival.player, rival.gains, outcome);
    if (them.score.total > me.score.total) return LOSS;
    if (them.score.total < me.score.total) continue;

    const mine = me.tiebreaker.pick;
    const theirs = them.tiebreaker.pick;
    const behindOnLowerTiers = comparePlayerScoresOnMerit(me, them) > 0;
    if (
      isMondayNightSettled ||
      mine == null ||
      theirs == null ||
      mine === theirs
    ) {
      // Monday night cannot separate them, or it already has, so the tiers
      // `comparePlayerScoresOnMerit` runs decide it.
      if (behindOnLowerTiers) return LOSS;
      continue;
    }

    level.push(them.name);
    const midpoint = (mine + theirs) / 2;
    const midpointWins = Number.isInteger(midpoint) && !behindOnLowerTiers;
    if (mine < theirs) {
      hi = Math.min(hi, midpointWins ? midpoint : Math.ceil(midpoint) - 1);
    } else {
      lo = Math.max(lo, midpointWins ? midpoint : Math.floor(midpoint) + 1);
    }
  }

  if (lo > hi) return LOSS;
  return level.length === 0 ? WIN : { kind: "onTotal", lo, hi, rivals: level };
}

/** Whether `a` takes the week on more totals than `b`: a win, or a wider range. */
function isBetter(a: Verdict, b: Verdict): boolean {
  if (a.kind === "loss") return false;
  if (b.kind === "loss") return true;
  if (a.kind === "win") return b.kind !== "win";
  if (b.kind === "win") return false;
  return a.hi - a.lo > b.hi - b.lo;
}

type RouteOutcome = {
  verdict: Verdict;
  /** The way the games out of the player's hands fall, for the best case only. */
  luck: number;
};

/**
 * What a set of the player's own picks landing is worth however the games they left
 * blank fall, which is a route that can be reported without conditions.
 */
function guaranteedVerdict(
  hits: number,
  luckOutcomes: Array<number>,
  read: (outcome: number) => Verdict,
): Verdict {
  let lo = 0;
  let hi = Number.POSITIVE_INFINITY;
  const level = new Set<string>();

  for (const luck of luckOutcomes) {
    const verdict = read(hits | luck);
    if (verdict.kind === "loss") return LOSS;
    if (verdict.kind === "onTotal") {
      lo = Math.max(lo, verdict.lo);
      hi = Math.min(hi, verdict.hi);
      verdict.rivals.forEach((name) => level.add(name));
    }
  }

  if (lo > hi) return LOSS;
  return level.size === 0
    ? WIN
    : { kind: "onTotal", lo, hi, rivals: [...level] };
}

/**
 * The best those same picks can do once the games the player left blank are allowed
 * to fall their way, and the way they have to fall, which is where `needsHelp` comes
 * from.
 */
function bestVerdict(
  hits: number,
  luckOutcomes: Array<number>,
  read: (outcome: number) => Verdict,
): RouteOutcome {
  let best: Verdict = LOSS;
  let bestLuck = 0;
  for (const luck of luckOutcomes) {
    const verdict = read(hits | luck);
    if (isBetter(verdict, best)) {
      best = verdict;
      bestLuck = luck;
    }
  }
  return { verdict: best, luck: bestLuck };
}

function outlookOf(verdict: Verdict, isSettled: boolean): MondayNightOutlook {
  if (verdict.kind !== "onTotal") {
    return isSettled ? { kind: "settled" } : { kind: "notNeeded" };
  }
  return {
    kind: "range",
    min: verdict.lo > 0 ? verdict.lo : undefined,
    max: Number.isFinite(verdict.hi) ? verdict.hi : undefined,
    rivals: verdict.rivals,
  };
}

function sameOutlook(a: MondayNightOutlook, b: MondayNightOutlook): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind !== "range" || b.kind !== "range") return true;
  return (
    a.min === b.min && a.max === b.max && a.rivals.join() === b.rivals.join()
  );
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

/**
 * The fewest of their own remaining picks the player has to win to reach a rival.
 *
 * A game the two picked differently swings two points, since the point one takes is
 * one the other does not, so those are spent first. A game only the player picked
 * swings one. Undefined where nothing they do is enough, which is the same
 * arithmetic `applyKnockouts` knocks a player out on total score with.
 *
 * A game only the rival picked is assumed to miss, which is what makes this a floor.
 */
type PickGap = {
  /** Games the two picked different teams in, worth two points each. */
  opposed: number;
  /** Games the player picked and the rival left blank, worth one. */
  playerOnly: number;
};

function countAgainst(
  playerIndex: number,
  rivalIndex: number,
  games: Array<RemainingGame>,
): PickGap {
  let opposed = 0;
  let playerOnly = 0;
  games.forEach((game) => {
    const difference = pickDifference(game, playerIndex, rivalIndex);
    if (difference === "opposed") opposed += 1;
    else if (difference === "playerOnly") playerOnly += 1;
  });
  return { opposed, playerOnly };
}

function fewestWinsToCatch(
  { opposed, playerOnly }: PickGap,
  gap: number,
  clear: boolean,
): number | undefined {
  const target = gap + opposed + (clear ? 1 : 0);
  if (target <= 0) return 0;
  const onDifferent = Math.min(opposed, Math.ceil(target / 2));
  const onOwn = Math.max(0, target - onDifferent * 2);
  return onOwn > playerOnly ? undefined : onDifferent + onOwn;
}

function headline(
  player: PlayerScore,
  playerIndex: number,
  rivals: Array<{ player: PlayerScore; index: number }>,
  games: Array<RemainingGame>,
): PlayerAnalysis {
  const counts = rivals.map((rival) => {
    const gap = rival.player.score.total - player.score.total;
    // Both targets read off one walk. They differ only by the point that clears a
    // draw, never in what the two players have left to differ on.
    const against = countAgainst(playerIndex, rival.index, games);
    return {
      toLevel: fewestWinsToCatch(against, gap, false),
      toClear: fewestWinsToCatch(against, gap, true),
    };
  });

  // `toLevel` is only absent where `applyKnockouts` has already knocked the player
  // out on total score, which `getPlayerAnalysis` answers before reaching here.
  const minimumWins = Math.max(
    0,
    ...counts.map((count) => count.toLevel).filter((count) => count != null),
  );
  return {
    kind: "headline",
    player: player.name,
    remainingPickCount: games.filter(
      (game) => game.cells[playerIndex].team != null,
    ).length,
    minimumWins,
    // Winning that many still only draws level with somebody, so the tiebreaker
    // would decide it.
    needsMondayNight: counts.some(
      (count) => count.toClear == null || count.toClear > minimumWins,
    ),
  };
}

type Route = { hits: number; outcome: RouteOutcome };

type Search = { minimal: Array<Route>; outrightAt?: number };

/**
 * The sets of the player's own picks that take the week, each one minimal.
 *
 * `ordered` is read fewest games first, so a set holding a winner already found adds
 * nothing. It is still read while `outrightAt` is open, since a bigger set can win
 * outright where the one inside it only draws level.
 */
function search(
  ordered: Array<number>,
  outcomeOf: (hits: number) => RouteOutcome,
): Search {
  const minimal: Array<Route> = [];
  let outrightAt: number | undefined;
  for (const hits of ordered) {
    const isRedundant = minimal.some(
      (found) => (found.hits & hits) === found.hits,
    );
    if (isRedundant && outrightAt != null) continue;
    const outcome = outcomeOf(hits);
    if (outcome.verdict.kind === "loss") continue;
    if (outcome.verdict.kind === "win" && outrightAt == null) {
      outrightAt = bitCount(hits);
    }
    if (!isRedundant) minimal.push({ hits, outcome });
  }
  return { minimal, outrightAt };
}

/**
 * The games the player left blank, and who has to miss in each for `luck` to land.
 *
 * A bit set in `luck` is the game's coverer covering, so every other team a player
 * still standing picked there has to miss. A bit clear is the coverer missing.
 */
function uncontrolledGames(
  contested: Array<RemainingGame>,
  live: Array<number>,
  coverers: Array<string>,
  playerIndex: number,
  luck: number,
): Array<UncontrolledGame> {
  return contested
    .map((game, bit): UncontrolledGame | null => {
      if (game.cells[playerIndex].team != null) return null;
      const mask = 1 << bit;
      const covers = (luck & mask) !== 0;
      const teams = live
        .map((index) => game.cells[index].team)
        .filter((team) => team != null);
      return {
        label: game.label,
        needsToMiss: [
          ...new Set(
            covers
              ? teams.filter((team) => team !== coverers[bit])
              : [coverers[bit]],
          ),
        ],
      };
    })
    .filter((game) => game != null);
}

type RouteShape = Pick<
  Extract<PlayerAnalysis, { kind: "paths" }>,
  "mustWin" | "pool" | "routes" | "hiddenRouteCount" | "mondayNight"
>;

/** The games every route needs, and the ways past them: one pool, or a list. */
function reduceRoutes(
  minimal: Array<Route>,
  dropped: number,
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
    outlook: outlookOf(route.outcome.verdict, isMondayNightSettled),
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
    dropped === 0 &&
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
    hiddenRouteCount: Math.max(0, routes.length - MAX_LISTED_ROUTES) + dropped,
    mondayNight: isOneOutlook ? rests[0].outlook : undefined,
  };
}

/**
 * Where a player stands in a week, and what they still have to do to win it.
 *
 * Answers for every player, knocked out or not, and for a week already decided as
 * well as one being played. Undefined where the sheet holds nobody by that name,
 * which is the only way the question has no answer at all.
 */
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
  if (player.status.isKnockedOut) {
    return { playerIndex, player, rivals: [], analysis: knockedOut(player) };
  }

  // Nothing is left to play, so the knockouts have already settled the week and
  // whoever they left standing has won it. Said here rather than searched for,
  // because the search reads the lower tiers in an order of its own, and on a
  // week nobody can change it would sometimes disagree with the standings.
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

/** Everyone still able to take the week off this player. */
function liveRivals(
  players: RakMadnessScores["scores"],
  playerIndex: number,
): Array<{ player: RakMadnessScores["scores"][number]; index: number }> {
  return players
    .map((it, index) => ({ player: it, index }))
    .filter((it) => it.index !== playerIndex && !it.player.status.isKnockedOut);
}

export default function getPlayerAnalysis(
  scores: RakMadnessScores,
  playerName: string,
): PlayerAnalysis | undefined {
  const settled = settledAnalysis(scores, playerName);
  if (settled == null) return undefined;
  if (settled.analysis != null) return settled.analysis;
  const { playerIndex, player, rivals } = settled;
  const players = scores.scores;

  // A game every live player picked the same way moves all their scores together,
  // in the total and in both tiebreaker tiers, so it cannot change the order.
  const games = remainingGames(players);
  if (games.length > MAX_SEARCHED_GAMES) {
    return headline(player, playerIndex, rivals, games);
  }

  const live = [playerIndex, ...rivals.map((it) => it.index)];
  const contested = games.filter(
    (game) => new Set(live.map((index) => game.cells[index].team)).size > 1,
  );

  // The bit for a game reads as the player's own pick landing, or where they have
  // no pick, as a live rival's. A contested game always holds one of those.
  const coverers = contested.map(
    (game) =>
      game.cells[playerIndex].team ??
      live.map((index) => game.cells[index].team).find((team) => team != null)!,
  );

  const gains = gainsFor(playerIndex, contested, coverers);
  const scoredRivals: Array<Rival> = rivals.map((rival) => ({
    player: rival.player,
    gains: gainsFor(rival.index, contested, coverers),
  }));
  const isMondayNightSettled = scores.tiebreaker != null;
  const verdicts = new Map<number, ReturnType<typeof evaluate>>();
  const read = (outcome: number) => {
    const held = verdicts.get(outcome);
    if (held != null) return held;
    const verdict = evaluate(
      player,
      gains,
      scoredRivals,
      outcome,
      isMondayNightSettled,
    );
    verdicts.set(outcome, verdict);
    return verdict;
  };

  let mineMask = 0;
  let luckMask = 0;
  contested.forEach((game, bit) => {
    if (game.cells[playerIndex].team != null) mineMask |= 1 << bit;
    else luckMask |= 1 << bit;
  });

  const ordered = subMasks(mineMask)
    .map((mask) => ({ mask, bits: bitCount(mask) }))
    .sort((a, b) => a.bits - b.bits || a.mask - b.mask)
    .map((counted) => counted.mask);
  const luckOutcomes = subMasks(luckMask);

  // Held against the player first, so a route that survives every way the games
  // they left blank can fall is reported without conditions.
  let { minimal, outrightAt } = search(ordered, (hits) => ({
    verdict: guaranteedVerdict(hits, luckOutcomes, read),
    luck: 0,
  }));
  let needsHelp: Array<UncontrolledGame> = [];
  let dropped = 0;
  if (minimal.length === 0 && luckMask !== 0) {
    const helped = search(ordered, (hits) =>
      bestVerdict(hits, luckOutcomes, read),
    );
    const [best] = helped.minimal;
    if (best != null) {
      // `needsHelp` is written once for every route shown, so the routes wanting
      // those games to fall some other way are counted rather than listed.
      const kept = helped.minimal.filter(
        (route) => route.outcome.luck === best.outcome.luck,
      );
      minimal = kept;
      dropped = helped.minimal.length - kept.length;
      outrightAt = helped.outrightAt;
      needsHelp = uncontrolledGames(
        contested,
        live,
        coverers,
        playerIndex,
        best.outcome.luck,
      );
    }
  }

  if (minimal.length === 0) {
    return knockedOut(player);
  }
  // Nothing left to win, and nothing the games they left blank can do about it.
  // A route that only survives because those fell right is not a clinch.
  if (
    needsHelp.length === 0 &&
    minimal.length === 1 &&
    minimal[0].hits === 0 &&
    minimal[0].outcome.verdict.kind === "win"
  ) {
    return { kind: "clinched", player: player.name };
  }

  return {
    kind: "paths",
    player: player.name,
    ...reduceRoutes(
      minimal,
      dropped,
      contested,
      playerIndex,
      isMondayNightSettled,
    ),
    outrightAt,
    needsHelp,
  };
}
