import getHeadToHead from "./headToHead";
import { pick, player } from "./scoringTestFixtures";

describe("getHeadToHead", () => {
  it("splits the differing games into open and decided", () => {
    const dee = player({
      name: "Dee",
      total: 1,
      pro: [pick("KC -3", "yes"), pick("SF"), pick("BUF")],
    });
    const cal = player({
      name: "Cal",
      pro: [pick("DEN 3", "no"), pick("LAR"), pick("BUF")],
    });

    const result = getHeadToHead([dee, cal], dee, cal);

    expect(result.decided).toEqual(new Set(["P1"]));
    expect(result.open).toEqual(new Set(["P2"]));
  });

  it("names the player behind as the one chasing", () => {
    const dee = player({ name: "Dee", total: 2 });
    const cal = player({ name: "Cal", total: 5 });

    const result = getHeadToHead([cal, dee], dee, cal);

    expect(result.leader).toBe(cal);
    expect(result.trailer).toBe(dee);
    expect(result.gap).toBe(3);
  });

  it("counts how many opposed open games the trailer needs to pass", () => {
    const cal = player({
      name: "Cal",
      total: 1,
      pro: [pick("KC"), pick("SF"), pick("BUF")],
    });
    const dee = player({
      name: "Dee",
      pro: [pick("DEN"), pick("LAR"), pick("NYJ")],
    });

    const result = getHeadToHead([cal, dee], cal, dee);

    // Behind by 1, so taking 2 of the 3 only draws level at 2 each.
    expect(result.verdict).toEqual({ kind: "pass", needed: 3 });
  });

  it("says the best the trailer can do is draw level", () => {
    const cal = player({ name: "Cal", total: 1, pro: [pick("KC")] });
    const dee = player({ name: "Dee", pro: [pick("DEN")] });

    expect(getHeadToHead([cal, dee], cal, dee).verdict).toEqual({
      kind: "level",
    });
  });

  it("says the trailer is out when the open games cannot close the gap", () => {
    const cal = player({ name: "Cal", total: 2, pro: [pick("KC")] });
    const dee = player({ name: "Dee", pro: [pick("DEN")] });

    expect(getHeadToHead([cal, dee], cal, dee).verdict).toEqual({
      kind: "out",
    });
  });

  it("counts a game only the trailer picked once", () => {
    const cal = player({ name: "Cal", total: 1, pro: [pick(""), pick("")] });
    const dee = player({ name: "Dee", pro: [pick("DEN"), pick("NYJ")] });

    expect(getHeadToHead([cal, dee], cal, dee).verdict).toEqual({
      kind: "pass",
      needed: 2,
    });
  });
});
