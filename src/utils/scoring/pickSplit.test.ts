import { League } from "../../types/League";
import { liveGame } from "./leagueResultFixtures";
import pickSplit from "./pickSplit";
import { pick, player } from "./scoringTestFixtures";

const result = liveGame({
  home: "BUF",
  away: "KC",
  homeScore: 7,
  awayScore: 3,
});
const game = { label: "P1", league: League.PRO, name: "KC @ BUF", result };

describe("pickSplit", () => {
  it("counts each side's picks, spread or not, in any case", () => {
    const players = [
      player({ name: "A", pro: [pick("KC -3")] }),
      player({ name: "B", pro: [pick("kc")] }),
      player({ name: "C", pro: [pick("BUF +3")] }),
    ];
    expect(pickSplit(players, game, result)).toEqual({ away: 2, home: 1 });
  });

  it("counts a blank cell, another team, or no cell for neither side", () => {
    const players = [
      player({ name: "A", pro: [pick("")] }),
      player({ name: "B", pro: [pick("DEN")] }),
      player({ name: "C" }),
    ];
    expect(pickSplit(players, game, result)).toEqual({ away: 0, home: 0 });
  });
});
