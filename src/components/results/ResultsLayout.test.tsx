import { screen, waitFor } from "@testing-library/react";
import { useLocation } from "react-router";

vi.mock("../../utils/getLeagueInfo");
vi.mock("../../utils/readFileToBuffer");
vi.mock("../../utils/scoring/getPlayerScores");
vi.mock("../../utils/buildSpreadsheetBuffer");

// The URL each judgment was made on, beside what the guard was given to judge.
const judged = vi.hoisted(
  () => [] as Array<[string, string | undefined, string | undefined]>,
);
vi.mock("../../hooks/useWeekRouteGuard", async (importOriginal) => {
  const real =
    await importOriginal<typeof import("../../hooks/useWeekRouteGuard")>();
  function useJudgedGuard(season?: string, week?: string) {
    judged.push([useLocation().pathname, season, week]);
    return real.default(season, week);
  }
  return { default: useJudgedGuard };
});

import { mountApp, setUpAppTest } from "../../appTestFixtures";

beforeEach(() => {
  judged.length = 0;
  setUpAppTest();
});

describe("ResultsLayout", () => {
  it("judges a bare week URL only once it lands on a page", async () => {
    mountApp("/foo/3");

    await screen.findByText("Use Local Spreadsheet");
    await waitFor(() =>
      expect(screen.getAllByText("Unknown Season")).toHaveLength(1),
    );
    const onBareUrl = judged.filter(([path]) => path === "/foo/3");
    expect(onBareUrl.length).toBeGreaterThan(0);
    expect(onBareUrl).toEqual(
      onBareUrl.map(() => ["/foo/3", undefined, undefined]),
    );
    expect(judged).toContainEqual(["/foo/3/scoreboard", "foo", "3"]);
  });
});
