import {
  PickResult,
  PlayerScore,
  RakMadnessScores,
  Status,
} from "../../types/RakMadnessScores";
import isWinnerDecided, { isWeekWon } from "./isWinnerDecided";

function pickResult(status: Status): PickResult {
  return {
    pick: "TCU -13.5",
    status,
    explanation: { header: "Final Score", message: "" },
  };
}

function player(name: string, statuses: Array<Status>): PlayerScore {
  return {
    id: name,
    name,
    score: { total: 10, college: 5, pro: 5, proAgainstTheSpread: 5 },
    tiebreaker: { pick: 40, distance: 1 },
    college: statuses.map(pickResult),
    pro: statuses.map(pickResult),
    status: { hasNoPicks: false, isKnockedOut: false },
  };
}

function knockedOut(score: PlayerScore): PlayerScore {
  return { ...score, status: { ...score.status, isKnockedOut: true } };
}

function week(
  players: Array<PlayerScore>,
  tiebreaker?: number,
): RakMadnessScores {
  return { tiebreaker, scores: players };
}

describe("isWinnerDecided", () => {
  it("calls a week decided once every pick is scored", () => {
    expect(isWinnerDecided(week([player("Alice", ["yes", "no"])], 41))).toBe(
      true,
    );
  });

  it("holds off while a game is still to finish", () => {
    expect(
      isWinnerDecided(
        week(
          [
            player("Alice", ["yes", "incomplete"]),
            player("Bob", ["no", "incomplete"]),
          ],
          41,
        ),
      ),
    ).toBe(false);
  });

  it("holds off when a game could not be scored for anyone", () => {
    expect(
      isWinnerDecided(
        week(
          [
            player("Alice", ["yes", "unscoreable"]),
            player("Bob", ["no", "unscoreable"]),
          ],
          41,
        ),
      ),
    ).toBe(false);
  });

  it("calls a week decided when one player alone left a pick blank", () => {
    expect(
      isWinnerDecided(
        week(
          [
            player("Alice", ["yes", "no"]),
            player("Bob", ["yes", "unscoreable"]),
          ],
          41,
        ),
      ),
    ).toBe(true);
  });

  it("holds off until the Monday night tiebreaker is settled", () => {
    expect(isWinnerDecided(week([player("Alice", ["yes"])]))).toBe(false);
  });
});

describe("isWeekWon", () => {
  it("calls a running week won once the knockouts leave one player standing", () => {
    expect(
      isWeekWon(
        week([
          player("Alice", ["yes", "incomplete"]),
          knockedOut(player("Bob", ["no", "incomplete"])),
        ]),
      ),
    ).toBe(true);
  });

  it("holds off while two players are still standing", () => {
    expect(
      isWeekWon(
        week([
          player("Alice", ["yes", "incomplete"]),
          player("Bob", ["no", "incomplete"]),
        ]),
      ),
    ).toBe(false);
  });

  it("does not count a row under a shared name as a rival", () => {
    expect(
      isWeekWon(
        week([
          player("Alice", ["yes", "incomplete"]),
          player("Bob", ["no", "incomplete"]),
          player("Bob", ["no", "incomplete"]),
        ]),
      ),
    ).toBe(true);
  });

  it("calls a decided week won", () => {
    expect(isWeekWon(week([player("Alice", ["yes", "no"])], 41))).toBe(true);
  });
});
