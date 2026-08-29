import { bench, describe } from "vitest";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import applyKnockouts from "./applyKnockouts";
import {
  BENCH_WEEK,
  benchFetch,
  benchPicksBuffer,
  benchResults,
  WeekPhase,
} from "./benchFixtures";
import getPlayerAnalysis from "./getPlayerAnalysis";
import { getPlayerScores } from "./getPlayerScores";
import getTiebreakerScore from "./getTiebreakerScore";
import isEveryGameSettled from "./isEveryGameSettled";
import parsePicksWorkbook from "./parsePicksWorkbook";
import { indexResults } from "./resultsIndex";
import scorePlayers from "./scorePlayers";
import weekGames from "./weekGames";

const SEASON = 2024;

// Built once. A `bench` body runs thousands of times, so setup inside one is
// measured with it.
const picksBuffer = await benchPicksBuffer();
const parsed = await parsePicksWorkbook(picksBuffer);

function weekAt(phase: WeekPhase) {
  const results = benchResults(phase);
  const indexed = {
    college: indexResults(results.college),
    pro: indexResults(results.pro),
  };
  const tiebreaker = getTiebreakerScore(
    parsed.tiebreakerGameKey,
    parsed.rows[0],
    indexed.college,
    indexed.pro,
  );
  const sorted = scorePlayers(parsed, results, tiebreaker, indexed);
  const scores: RakMadnessScores = {
    tiebreaker,
    scores: applyKnockouts(sorted, tiebreaker),
    games: weekGames(parsed, results, indexed),
  };
  return { results, indexed, tiebreaker, sorted, scores };
}

const kickoff = weekAt("kickoff");
const sundayNight = weekAt("sundayNight");
const settled = weekAt("settled");

describe("getPlayerScores, end to end", () => {
  const run = (phase: WeekPhase) => async () => {
    globalThis.fetch = benchFetch(phase);
    localStorage.clear();
    await getPlayerScores(BENCH_WEEK, picksBuffer, SEASON);
  };

  bench("kickoff", run("kickoff"));
  bench("sunday night", run("sundayNight"));
  bench("settled", run("settled"));
});

describe("scorePlayers", () => {
  bench("kickoff", () => {
    scorePlayers(parsed, kickoff.results, kickoff.tiebreaker);
  });
  bench("sunday night", () => {
    scorePlayers(parsed, sundayNight.results, sundayNight.tiebreaker);
  });
});

describe("applyKnockouts", () => {
  bench("sunday night", () => {
    applyKnockouts(sundayNight.sorted, sundayNight.tiebreaker);
  });
  bench("settled", () => {
    applyKnockouts(settled.sorted, settled.tiebreaker);
  });
});

describe("weekGames", () => {
  bench("sunday night", () => {
    weekGames(parsed, sundayNight.results, sundayNight.indexed);
  });
});

describe("isEveryGameSettled", () => {
  bench("sunday night", () => {
    isEveryGameSettled(sundayNight.scores.scores);
  });
});

describe("getPlayerAnalysis", () => {
  // A fixed row rather than the widest, so the number holds run to run.
  const chased = sundayNight.scores.scores[10].name;

  bench("two games open", () => {
    getPlayerAnalysis(sundayNight.scores, chased);
  });
  bench("settled", () => {
    getPlayerAnalysis(settled.scores, chased);
  });
});
