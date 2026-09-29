import { League } from "../../types/League";
import pickFor from "./pickFor";
import { pick, player } from "./scoringTestFixtures";

const alice = player({
  name: "Alice",
  college: [pick("MICH -7"), pick("OSU")],
  pro: [pick("KC -3")],
});

describe("pickFor", () => {
  it("finds a college pick by its label", () => {
    const game = { label: "C2", league: League.COLLEGE, name: "OSU at PSU" };
    expect(pickFor(alice, game)?.pick).toBe("OSU");
  });

  it("finds a pro pick by its label", () => {
    const game = { label: "P1", league: League.PRO, name: "KC at BUF" };
    expect(pickFor(alice, game)?.pick).toBe("KC -3");
  });

  it("finds nothing for a label past the player's picks", () => {
    const game = { label: "P2", league: League.PRO, name: "DEN at LV" };
    expect(pickFor(alice, game)).toBeUndefined();
  });
});
