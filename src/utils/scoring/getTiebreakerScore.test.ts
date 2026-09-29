import { finalGame, liveGame } from "./leagueResultFixtures";
import getTiebreakerScore from "./getTiebreakerScore";
import { indexResults } from "./resultsIndex";

const noGames = indexResults([]);
const college = indexResults([
  finalGame({ home: "OSU", away: "PSU", homeScore: 27, awayScore: 24 }),
]);
const pro = indexResults([
  finalGame({ home: "KC", away: "BUF", homeScore: 30, awayScore: 20 }),
  liveGame({ home: "DEN", away: "LV", homeScore: 10, awayScore: 7 }),
]);

describe("getTiebreakerScore", () => {
  it("is undefined when the sheet names no tiebreaker game", () => {
    expect(getTiebreakerScore(undefined, { P1: "KC" }, college, pro)).toBe(
      undefined,
    );
  });

  it("is undefined when the first player left the game blank", () => {
    expect(getTiebreakerScore("P1", { P1: "" }, college, pro)).toBeUndefined();
  });

  it("reads a pro game's total from the pro results", () => {
    expect(getTiebreakerScore("P1", { P1: "KC -3" }, noGames, pro)).toBe(50);
  });

  it("reads a college game's total from the college results", () => {
    expect(getTiebreakerScore("C1", { C1: "osu" }, college, noGames)).toBe(51);
  });

  it("is undefined until the game is final", () => {
    expect(getTiebreakerScore("P1", { P1: "DEN" }, noGames, pro)).toBe(
      undefined,
    );
  });

  it("is undefined when the team is not in the league's results", () => {
    expect(getTiebreakerScore("C1", { C1: "KC" }, college, pro)).toBe(
      undefined,
    );
  });
});
