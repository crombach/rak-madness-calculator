import differingGames from "./differingGames";
import { pick, player } from "./scoringTestFixtures";

describe("differingGames", () => {
  it("names only the games the two players picked differently", () => {
    const alice = player({
      name: "Alice",
      college: [pick("MICH -7"), pick("OSU")],
      pro: [pick("KC -3"), pick("BUF")],
    });
    const bob = player({
      name: "Bob",
      college: [pick("MICH -7"), pick("PSU")],
      pro: [pick("DEN 3"), pick("BUF")],
    });

    expect(differingGames(alice, bob)).toEqual(new Set(["C2", "P1"]));
  });

  it("reads hand-typed cells for the same pick as the same", () => {
    const alice = player({
      name: "Alice",
      pro: [pick("KC -3"), pick("DEN 3")],
    });
    const bob = player({ name: "Bob", pro: [pick("kc-3"), pick("DEN +3")] });

    expect(differingGames(alice, bob).size).toBe(0);
  });

  it("tells the same team apart by its spread", () => {
    const alice = player({ name: "Alice", pro: [pick("KC -3")] });
    const bob = player({ name: "Bob", pro: [pick("KC -3.5")] });

    expect(differingGames(alice, bob)).toEqual(new Set(["P1"]));
  });
});
