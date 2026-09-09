import {
  PickResult,
  PlayerScore,
  RakMadnessScores,
  Status,
} from "../../types/RakMadnessScores";
import { pickChangeKey } from "./gameColumns";
import scoreChanges from "./scoreChanges";

function pick(status: Status = "incomplete"): PickResult {
  return { pick: "BUF -7", status, explanation: { header: "P1", message: "" } };
}

function player({
  name,
  pro = [pick()],
  isKnockedOut = false,
}: {
  name: string;
  pro?: Array<PickResult>;
  isKnockedOut?: boolean;
}): PlayerScore {
  return {
    name,
    score: { total: 0, college: 0, pro: 0, proAgainstTheSpread: 0 },
    tiebreaker: {},
    college: [],
    pro,
    status: { hasNoPicks: false, hasBlankPick: false, isKnockedOut },
  };
}

function scoresFor(players: Array<PlayerScore>): RakMadnessScores {
  return { scores: players };
}

describe("scoreChanges", () => {
  it("has nothing to compare a first load against", () => {
    const changes = scoreChanges(
      undefined,
      scoresFor([player({ name: "Alice" })]),
    );
    expect(changes.players.size).toBe(0);
    expect(changes.picks.size).toBe(0);
  });

  it("carries nothing forward when nothing changed", () => {
    const before = scoresFor([player({ name: "Alice" })]);
    const after = scoresFor([player({ name: "Alice" })]);

    const changes = scoreChanges(before, after);

    expect(changes.players.size).toBe(0);
    expect(changes.picks.size).toBe(0);
  });

  it("names the status a resolved pick left, keyed to the player and the game", () => {
    const before = scoresFor([player({ name: "Alice", pro: [pick()] })]);
    const after = scoresFor([player({ name: "Alice", pro: [pick("yes")] })]);

    const changes = scoreChanges(before, after);

    expect(changes.picks.get(pickChangeKey("Alice", "P1"))).toBe("incomplete");
    expect(changes.players.size).toBe(0);
  });

  it("names a player just knocked out, but not one already out or still in", () => {
    const before = scoresFor([
      player({ name: "Alice", isKnockedOut: false }),
      player({ name: "Bob", isKnockedOut: true }),
      player({ name: "Cara", isKnockedOut: false }),
    ]);
    const after = scoresFor([
      player({ name: "Alice", isKnockedOut: true }),
      player({ name: "Bob", isKnockedOut: true }),
      player({ name: "Cara", isKnockedOut: false }),
    ]);

    const changes = scoreChanges(before, after);

    expect(changes.players.get("Alice")).toBe(false);
    expect(changes.players.has("Bob")).toBe(false);
    expect(changes.players.has("Cara")).toBe(false);
  });

  it("ignores a player the previous score never had", () => {
    const before = scoresFor([player({ name: "Alice" })]);
    const after = scoresFor([
      player({ name: "Alice" }),
      player({ name: "Bob", isKnockedOut: true }),
    ]);

    const changes = scoreChanges(before, after);

    expect(changes.players.size).toBe(0);
  });
});
