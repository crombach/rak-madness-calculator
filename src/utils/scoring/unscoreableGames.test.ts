import { PlayerScore, Status } from "../../types/RakMadnessScores";
import unscoreableGames from "./unscoreableGames";

/** One college game and two pro ones, which is enough to label a column by. */
function player(
  name: string,
  pro: Array<{ status: Status; header?: string }>,
): PlayerScore {
  return {
    name,
    score: { total: 0, college: 0, pro: 0, proAgainstTheSpread: 0 },
    tiebreaker: {},
    college: [
      {
        pick: "UGA -3",
        status: "yes",
        explanation: { header: "Final Score", message: "" },
      },
    ],
    pro: pro.map(({ status, header }) => ({
      pick: "KC -3",
      status,
      explanation: { header: header ?? "Final Score", message: "" },
    })),
    status: { hasNoPicks: false, hasBlankPick: false, isKnockedOut: false },
  };
}

describe("unscoreableGames", () => {
  it("finds nothing in a week every pick was scored on", () => {
    expect(
      unscoreableGames([
        player("Rak", [{ status: "yes" }, { status: "no" }]),
        player("Alice", [{ status: "no" }, { status: "yes" }]),
      ]),
    ).toEqual([]);
  });

  it("names the game whose spread the rows contradict", () => {
    expect(
      unscoreableGames([
        player("Rak", [
          { status: "yes" },
          { status: "unscoreable", header: "Invalid Spread" },
        ]),
        player("Alice", [
          { status: "yes" },
          { status: "unscoreable", header: "Invalid Spread" },
        ]),
      ]),
    ).toEqual(["P2"]);
  });

  it("names a game the results do not hold", () => {
    expect(
      unscoreableGames([
        player("Rak", [{ status: "unscoreable", header: "Missing Game" }]),
        player("Alice", [{ status: "yes" }]),
      ]),
    ).toEqual(["P1"]);
  });

  it("leaves a blank cell alone, which is the player's own doing", () => {
    expect(
      unscoreableGames([
        player("Rak", [{ status: "unscoreable", header: "Missing Pick" }]),
        player("Alice", [{ status: "yes" }]),
      ]),
    ).toEqual([]);
  });

  it("has nothing to say about a week with no players in it", () => {
    expect(unscoreableGames([])).toEqual([]);
  });
});
