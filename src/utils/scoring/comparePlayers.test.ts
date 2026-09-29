import getComparison from "./comparePlayers";
import { pick, player } from "./scoringTestFixtures";

describe("getComparison", () => {
  it("sets each other player against the one ahead on points", () => {
    const dee = player({ name: "Dee", total: 2 });
    const cal = player({ name: "Cal", total: 5 });
    const bob = player({ name: "Bob", total: 4 });

    const result = getComparison([dee, cal, bob], [dee, cal, bob]);

    expect(result.leaders).toEqual([cal]);
    expect(result.matchups.map(({ leader }) => leader)).toEqual([cal, cal]);
    expect(result.matchups.map(({ trailer }) => trailer)).toEqual([dee, bob]);
  });

  it("names every player level on the most points, in the order chosen", () => {
    const dee = player({ name: "Dee", total: 5 });
    const cal = player({ name: "Cal", total: 5 });
    const bob = player({ name: "Bob", total: 4 });

    const result = getComparison([cal, bob, dee], [dee, cal, bob]);

    expect(result.leaders).toEqual([dee, cal]);
    expect(result.matchups).toHaveLength(2);
  });

  it("splits every game any two chosen players differ on into open and decided", () => {
    const dee = player({
      name: "Dee",
      pro: [pick("KC -3", "yes"), pick("SF"), pick("BUF")],
    });
    const cal = player({
      name: "Cal",
      pro: [pick("KC -3", "yes"), pick("SF"), pick("NYJ")],
    });
    const bob = player({
      name: "Bob",
      pro: [pick("DEN 3", "no"), pick("SF"), pick("BUF")],
    });

    const result = getComparison([dee, cal, bob], [dee, cal, bob]);

    expect(result.decided).toEqual(new Set(["P1"]));
    expect(result.open).toEqual(new Set(["P3"]));
  });
});
