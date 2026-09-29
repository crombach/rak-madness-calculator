import getComparison from "./comparePlayers";
import { pick, player } from "./scoringTestFixtures";

describe("getComparison", () => {
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
