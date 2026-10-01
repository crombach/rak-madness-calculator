import { describe, expect, it } from "vitest";
import resultsPath, { RESULTS_PAGE } from "./resultsPath";

describe("resultsPath", () => {
  it.each([
    [2024, "3", RESULTS_PAGE.picks, "/2024/3/picks"],
    [2024, "3", RESULTS_PAGE.scoreboard, "/2024/3/scoreboard"],
    ["2024", "3", RESULTS_PAGE.picks, "/2024/3/picks"],
  ])("builds %p, %p, %p", (season, week, page, expected) => {
    expect(resultsPath(season, week, page)).toBe(expected);
  });

  it("builds the knockouts page's target", () => {
    expect(resultsPath(2024, 3, RESULTS_PAGE.knockouts)).toBe(
      "/2024/3/knockouts",
    );
  });

  it("keeps an absent week as the literal string 'undefined'", () => {
    expect(resultsPath(2024, undefined, RESULTS_PAGE.scoreboard)).toBe(
      "/2024/undefined/scoreboard",
    );
  });
});
