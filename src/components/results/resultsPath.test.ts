import { describe, expect, it } from "vitest";
import resultsPath from "./resultsPath";

describe("resultsPath", () => {
  it("builds HomePage's navbar view-change target", () => {
    expect(resultsPath(2024, "3", "Picks")).toBe("/2024/3/picks");
  });

  it("builds HomePage's View Results target", () => {
    expect(resultsPath(2024, "3", "Scoreboard")).toBe("/2024/3/scoreboard");
  });

  it("builds ResultsLayout's view-switch target from string route params", () => {
    expect(resultsPath("2024", "3", "Picks")).toBe("/2024/3/picks");
  });

  it("builds CurrentWeekRedirect's target", () => {
    expect(resultsPath(2024, 3, "Scoreboard")).toBe("/2024/3/scoreboard");
  });

  it("keeps an absent week as the literal string 'undefined'", () => {
    expect(resultsPath(2024, undefined, "Scoreboard")).toBe(
      "/2024/undefined/scoreboard",
    );
  });
});
