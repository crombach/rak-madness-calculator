import { bench, describe } from "vitest";
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

describe("getLeagueResults, college", () => {
  bench("cold cache", async () => {
    globalThis.fetch = benchFetch("sundayNight");
    localStorage.clear();
    await getLeagueResults(
      League.COLLEGE,
      BENCH_WEEK,
      parsed.collegeMatchups,
      SEASON,
    );
  });

  bench("warm cache", async () => {
    globalThis.fetch = benchFetch("settled");
    await getLeagueResults(
      League.COLLEGE,
      BENCH_WEEK,
      parsed.collegeMatchups,
      SEASON,
    );
  });
});

describe("getLeagueResults, pro", () => {
  bench("cold cache", async () => {
    globalThis.fetch = benchFetch("sundayNight");
    localStorage.clear();
    await getLeagueResults(League.PRO, BENCH_WEEK, parsed.proMatchups, SEASON);
  });
});
