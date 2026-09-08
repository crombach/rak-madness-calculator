import { PickResult, PlayerScore, Status } from "../../types/RakMadnessScores";
import applyKnockouts from "./applyKnockouts";

function pickResult(pick: string, status: Status): PickResult {
  return {
    pick,
    status,
    explanation: { header: "Final Score", message: "" },
  };
}

type PlayerOptions = {
  name: string;
  college?: Array<PickResult>;
  pro?: Array<PickResult>;
  total?: number;
  collegeScore?: number;
  proScore?: number;
  proAgainstTheSpread?: number;
  tiebreakerPick?: number;
  distance?: number;
  hasNoPicks?: boolean;
};

function player({
  name,
  college = [],
  pro = [],
  total = 0,
  collegeScore = 0,
  proScore = 0,
  proAgainstTheSpread = 0,
  tiebreakerPick,
  distance,
  hasNoPicks = false,
}: PlayerOptions): PlayerScore {
  return {
    name,
    score: { total, college: collegeScore, pro: proScore, proAgainstTheSpread },
    tiebreaker: { pick: tiebreakerPick, distance },
    college,
    pro,
    status: { hasNoPicks, isKnockedOut: hasNoPicks },
  };
}

describe("applyKnockouts", () => {
  it("leaves the leader standing", () => {
    const result = applyKnockouts([
      player({ name: "Alice", total: 3 }),
      player({ name: "Bob", total: 3 }),
    ]);

    expect(result[0].status.isKnockedOut).toBe(false);
    expect(result[0].status.explanation).toBe("Not knocked out!");
  });

  it("calls the leader the winner once the tiebreaker game is final", () => {
    const result = applyKnockouts([player({ name: "Alice", total: 3 })], 47);

    expect(result[0].status.explanation).toBe("Winner!");
  });

  it("counts a game the rival left blank as ground still to make up", () => {
    // The leader left C1 blank, which scores "unscoreable", not "incomplete". Read from
    // the leader alone, C1 would look played and Bob would be knocked out.
    const result = applyKnockouts([
      player({
        name: "Alice",
        total: 1,
        college: [pickResult("undefined", "unscoreable")],
      }),
      player({
        name: "Bob",
        total: 0,
        college: [pickResult("MICH", "incomplete")],
      }),
    ]);

    expect(result[1].status.isKnockedOut).toBe(false);
    expect(result[1].status.explanation).toBe("Not knocked out!");
  });

  it("knocks out a player who submitted no picks", () => {
    const result = applyKnockouts([
      player({ name: "Alice", total: 3 }),
      player({ name: "Bob", hasNoPicks: true }),
    ]);

    expect(result[1].status.isKnockedOut).toBe(true);
    expect(result[1].status.explanation).toBe(
      "Knocked out due to having no picks.",
    );
  });

  it("knocks out a player whose remaining picks cannot close the gap", () => {
    const result = applyKnockouts([
      player({
        name: "Alice",
        total: 3,
        pro: [pickResult("BUF", "incomplete")],
      }),
      player({ name: "Bob", total: 1, pro: [pickResult("BUF", "incomplete")] }),
    ]);

    expect(result[1].status.isKnockedOut).toBe(true);
    expect(result[1].status.explanation).toBe(
      "Knocked out on Total Score by Alice. Behind by 2 with 0 different picks remaining.",
    );
  });

  it("omits the remaining-picks clause once the week is fully resolved", () => {
    const result = applyKnockouts([
      player({ name: "Alice", total: 3, pro: [pickResult("BUF", "yes")] }),
      player({ name: "Bob", total: 1, pro: [pickResult("BUF", "yes")] }),
    ]);

    expect(result[1].status.explanation).toBe(
      "Knocked out on Total Score by Alice. Behind by 2.",
    );
  });

  it("leaves a trailing player standing while different picks can close the gap", () => {
    const result = applyKnockouts([
      player({
        name: "Alice",
        total: 2,
        pro: [pickResult("BUF", "incomplete")],
      }),
      player({ name: "Bob", total: 1, pro: [pickResult("KC", "incomplete")] }),
    ]);

    expect(result[1].status.isKnockedOut).toBe(false);
  });

  it("knocks out a tied player on the college score tiebreaker", () => {
    const result = applyKnockouts([
      player({
        name: "Alice",
        total: 5,
        collegeScore: 3,
        proScore: 2,
        college: [pickResult("OSU", "incomplete")],
        tiebreakerPick: 40,
      }),
      player({
        name: "Bob",
        total: 5,
        collegeScore: 2,
        proScore: 3,
        college: [pickResult("OSU", "incomplete")],
        tiebreakerPick: 40,
      }),
    ]);

    expect(result[1].status.isKnockedOut).toBe(true);
    expect(result[1].status.explanation).toBe(
      "Knocked out on College Score tiebreaker by Alice. " +
        "Behind by 1 with 0 different college picks remaining.",
    );
  });

  it("omits the remaining-picks clause on the college tiebreaker once resolved", () => {
    const result = applyKnockouts([
      player({
        name: "Alice",
        total: 5,
        collegeScore: 3,
        proScore: 2,
        college: [pickResult("OSU", "yes")],
        tiebreakerPick: 40,
      }),
      player({
        name: "Bob",
        total: 5,
        collegeScore: 2,
        proScore: 3,
        college: [pickResult("OSU", "yes")],
        tiebreakerPick: 40,
      }),
    ]);

    expect(result[1].status.explanation).toBe(
      "Knocked out on College Score tiebreaker by Alice. Behind by 1.",
    );
  });

  it("counts a differing college pick as a way back into the college tiebreaker", () => {
    const result = applyKnockouts([
      player({
        name: "Alice",
        total: 5,
        collegeScore: 3,
        proScore: 2,
        college: [pickResult("OSU", "incomplete")],
        tiebreakerPick: 40,
      }),
      player({
        name: "Bob",
        total: 5,
        collegeScore: 2,
        proScore: 3,
        college: [pickResult("MICH", "incomplete")],
        tiebreakerPick: 40,
      }),
    ]);

    expect(result[1].status.isKnockedOut).toBe(false);
  });

  it("falls through to the against-the-spread tiebreaker once college is settled", () => {
    const result = applyKnockouts([
      player({
        name: "Alice",
        total: 4,
        collegeScore: 2,
        proScore: 2,
        proAgainstTheSpread: 2,
        college: [pickResult("OSU", "yes")],
        pro: [pickResult("BUF -3", "incomplete")],
        tiebreakerPick: 40,
      }),
      player({
        name: "Bob",
        total: 4,
        collegeScore: 2,
        proScore: 2,
        proAgainstTheSpread: 1,
        college: [pickResult("OSU", "yes")],
        pro: [pickResult("BUF -3", "incomplete")],
        tiebreakerPick: 40,
      }),
    ]);

    expect(result[1].status.isKnockedOut).toBe(true);
    expect(result[1].status.explanation).toBe(
      "Knocked out on Pro Score Against the Spread tiebreaker by Alice. " +
        "Behind by 1 with 0 different picks remaining for pro games with spreads.",
    );
  });

  it("omits the remaining-picks clause on the spread tiebreaker once resolved", () => {
    const result = applyKnockouts([
      player({
        name: "Alice",
        total: 4,
        collegeScore: 2,
        proScore: 2,
        proAgainstTheSpread: 2,
        college: [pickResult("OSU", "yes")],
        pro: [pickResult("BUF -3", "yes")],
        tiebreakerPick: 40,
      }),
      player({
        name: "Bob",
        total: 4,
        collegeScore: 2,
        proScore: 2,
        proAgainstTheSpread: 1,
        college: [pickResult("OSU", "yes")],
        pro: [pickResult("BUF -3", "yes")],
        tiebreakerPick: 40,
      }),
    ]);

    expect(result[1].status.explanation).toBe(
      "Knocked out on Pro Score Against the Spread tiebreaker by Alice. " +
        "Behind by 1.",
    );
  });

  // The cases below can at best tie on total score, and have equal, settled
  // college scores, so the against-the-spread tiebreaker decides them. Both rows
  // carry the same spread because a valid workbook cannot say otherwise, so only
  // two shapes are reachable: a differing pick on a game with a spread, and one on
  // a game without.
  function trailingBySpreadTiebreaker(
    leaderProPick: string,
    trailingProPick: string,
  ) {
    return applyKnockouts([
      player({
        name: "Alice",
        total: 5,
        collegeScore: 2,
        proScore: 3,
        proAgainstTheSpread: 2,
        college: [pickResult("OSU", "yes")],
        pro: [pickResult(leaderProPick, "incomplete")],
        tiebreakerPick: 40,
      }),
      player({
        name: "Bob",
        total: 4,
        collegeScore: 2,
        proScore: 2,
        proAgainstTheSpread: 1,
        college: [pickResult("OSU", "yes")],
        pro: [pickResult(trailingProPick, "incomplete")],
        tiebreakerPick: 40,
      }),
    ]);
  }

  it("counts a differing pro pick the trailing player took with a spread", () => {
    expect(
      trailingBySpreadTiebreaker("BUF -3", "KC -3")[1].status.isKnockedOut,
    ).toBe(false);
  });

  it("ignores a differing pro pick with no spread on either side", () => {
    const result = trailingBySpreadTiebreaker("BUF", "KC");

    expect(result[1].status.isKnockedOut).toBe(true);
    expect(result[1].status.explanation).toContain(
      "Knocked out on Pro Score Against the Spread tiebreaker",
    );
  });

  it("knocks out a tied player who is further from the Monday night total", () => {
    const result = applyKnockouts(
      [
        player({ name: "Alice", total: 4, tiebreakerPick: 45, distance: 2 }),
        player({ name: "Bob", total: 4, tiebreakerPick: 60, distance: 13 }),
      ],
      47,
    );

    expect(result[1].status.isKnockedOut).toBe(true);
    expect(result[1].status.explanation).toBe(
      "Knocked out on MNF Points tiebreaker by Alice. " +
        "Bob is 13 points off, and Alice is 2 points off.",
    );
  });

  it("leaves a tied player standing when nobody submitted a Monday night guess", () => {
    const result = applyKnockouts([
      player({ name: "Alice", total: 4 }),
      player({ name: "Bob", total: 4 }),
    ]);

    expect(result[1].status.isKnockedOut).toBe(false);
  });
});
