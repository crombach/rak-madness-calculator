import { describe, expect, it } from "vitest";
import resultsPath, { RESULTS_PAGE } from "./resultsPath";

describe("resultsPath", () => {
  it("builds HomePage's navbar view-change target", () => {
    expect(resultsPath(2024, "3", RESULTS_PAGE.picks)).toBe("/2024/3/picks");
  });

  it("builds HomePage's View Results target", () => {
    expect(resultsPath(2024, "3", RESULTS_PAGE.scoreboard)).toBe(
      "/2024/3/scoreboard",
    );
  });

  it("builds ResultsLayout's view-switch target from string route params", () => {
    expect(resultsPath("2024", "3", RESULTS_PAGE.picks)).toBe("/2024/3/picks");
  });

  it("builds CurrentWeekRedirect's target", () => {
    expect(resultsPath(2024, 3, RESULTS_PAGE.scoreboard)).toBe(
      "/2024/3/scoreboard",
    );
  });

  it("builds the swing games page's target", () => {
    expect(resultsPath(2024, 3, RESULTS_PAGE.swingGames)).toBe(
      "/2024/3/swings",
    );
  });

  it("keeps an absent week as the literal string 'undefined'", () => {
    expect(resultsPath(2024, undefined, RESULTS_PAGE.scoreboard)).toBe(
      "/2024/undefined/scoreboard",
    );
  });
});
