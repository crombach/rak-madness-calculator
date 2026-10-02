import { describe, expect, it } from "vitest";
import { KnockoutGame, finalGameThatKnockedOut } from "./knockoutTypes";

function game(
  label: string,
  isFinal: boolean,
  sidePlayers: Array<string>,
  tiebreakerPlayers?: Array<string>,
): KnockoutGame {
  return {
    label,
    name: `${label} game`,
    isFinal,
    sides: [{ team: "KC", pick: "KC -3", players: sidePlayers }],
    tiebreakers: tiebreakerPlayers && [
      { tiebreaker: "college", players: tiebreakerPlayers },
    ],
  };
}

describe("finalGameThatKnockedOut", () => {
  const knockouts = {
    games: [
      game("P1", false, ["Alice"]),
      game("P2", true, ["Bob"]),
      game("P3", true, [], ["Carol"]),
    ],
  };

  it("finds the final game a player went out on a pick in", () => {
    expect(finalGameThatKnockedOut(knockouts, "Bob")?.label).toBe("P2");
  });

  it("finds the final game a player went out on a tiebreaker in", () => {
    expect(finalGameThatKnockedOut(knockouts, "Carol")?.label).toBe("P3");
  });

  it("skips an open game, which has knocked nobody out yet", () => {
    expect(finalGameThatKnockedOut(knockouts, "Alice")).toBeUndefined();
  });

  it("answers nothing while the knockouts load", () => {
    expect(finalGameThatKnockedOut(undefined, "Bob")).toBeUndefined();
  });
});
