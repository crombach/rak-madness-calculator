import {
  PickResult,
  PlayerScore,
  RakMadnessScores,
} from "../../types/RakMadnessScores";
import getPlayerAnalysis from "./getPlayerAnalysis";

/**
 * A game the player left blank is held to its push rather than walked both ways,
 * which `getPlayerAnalysis` explains and this holds to.
 *
 * The same week is built twice, once on a whole line a margin can land on and once
 * half a point off it. Nothing else about the two differs, so every answer has to
 * match. A week is read at random because the property is about every shape of
 * week, not one, and the generator is seeded so a failure repeats.
 */

const WEEKS = 200;
const PLAYERS = 6;
const GAMES = 8;
/** How often a row leaves a game blank, which is what puts games in the walk. */
const BLANK_RATE = 0.25;

const TEAMS = ["KC", "BUF", "SF", "DAL", "PHI", "NYG", "BAL", "CIN"];

function pick(text: string): PickResult {
  return {
    pick: text,
    status: "incomplete",
    explanation: { header: "", message: "" },
  };
}

/** A linear congruential generator, so a seed reads the same week every run. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function randomWeek(seed: number, line: string): RakMadnessScores {
  const rand = seeded(seed);
  const sides = Array.from({ length: GAMES }, (_unused, game) => [
    TEAMS[(game * 2) % TEAMS.length],
    TEAMS[(game * 2 + 1) % TEAMS.length],
  ]);
  const scores: Array<PlayerScore> = Array.from(
    { length: PLAYERS },
    (_unused, index) => ({
      name: `P${index}`,
      score: {
        total: Math.floor(rand() * 5),
        college: 0,
        pro: 0,
        proAgainstTheSpread: 0,
      },
      tiebreaker: { pick: 30 + Math.floor(rand() * 20) },
      college: [],
      pro: sides.map(([home, away]) =>
        rand() < BLANK_RATE
          ? pick("")
          : pick(`${rand() < 0.5 ? home : away} ${line}`),
      ),
      status: { hasNoPicks: false, isKnockedOut: false },
    }),
  );
  return { scores };
}

/** An answer with the cells dropped, since those carry the line that differs. */
function withoutPicks(result: unknown): string {
  return JSON.stringify(result, (key, value) =>
    key === "pick" && typeof value === "string" ? "" : value,
  );
}

describe("a blank game held to its push", () => {
  it("answers a week the way a walk of both sides does", () => {
    for (let seed = 1; seed <= WEEKS; seed++) {
      const held = randomWeek(seed, "-3");
      const walked = randomWeek(seed, "-3.5");
      for (const player of held.scores) {
        expect(
          withoutPicks(getPlayerAnalysis(held, player.name)),
          `week ${seed}, ${player.name}`,
        ).toBe(withoutPicks(getPlayerAnalysis(walked, player.name)));
      }
    }
  });
});
