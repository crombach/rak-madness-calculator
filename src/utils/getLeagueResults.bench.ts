import { test } from "vitest";
import { League } from "../types/League";
import {
  BENCH_WEEK,
  benchFetch,
  benchPicksBuffer,
} from "./scoring/benchFixtures";
import parsePicksWorkbook from "./scoring/parsePicksWorkbook";
import { getLeagueResults } from "./getLeagueResults";

const SEASON = 2024;

const parsed = await parsePicksWorkbook(await benchPicksBuffer());

// Cold first, then warm off the cache it left. Two tests rather than a
// comparison, because `bench.compare` interleaves iterations and a cold run
// clearing storage mid-comparison would leave the warm one nothing to hit.
test("getLeagueResults, college, cold cache", async ({ bench }) => {
  await bench("cold cache", async () => {
    globalThis.fetch = benchFetch("sundayNight");
    localStorage.clear();
    await getLeagueResults(
      League.COLLEGE,
      BENCH_WEEK,
      parsed.collegeMatchups,
      SEASON,
    );
  }).run();
});

test("getLeagueResults, college, warm cache", async ({ bench }) => {
  await bench("warm cache", async () => {
    globalThis.fetch = benchFetch("settled");
    await getLeagueResults(
      League.COLLEGE,
      BENCH_WEEK,
      parsed.collegeMatchups,
      SEASON,
    );
  }).run();
});

test("getLeagueResults, pro", async ({ bench }) => {
  await bench("cold cache", async () => {
    globalThis.fetch = benchFetch("sundayNight");
    localStorage.clear();
    await getLeagueResults(League.PRO, BENCH_WEEK, parsed.proMatchups, SEASON);
  }).run();
});
