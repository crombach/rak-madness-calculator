import { PlayerScore } from "../../types/RakMadnessScores";
import comparePlayerScores, {
  comparePlayerScoresOnMerit,
} from "./comparePlayerScores";

/**
 * A player carrying only what the comparator reads. The picks themselves never
 * are: the tiers work off the totals the scoring already added up.
 */
function player(
  name: string,
  {
    total = 0,
    college = 0,
    proAgainstTheSpread = 0,
    distance,
    hasNoPicks = false,
    hasBlankPick = hasNoPicks,
  }: {
    total?: number;
    college?: number;
    proAgainstTheSpread?: number;
    distance?: number;
    hasNoPicks?: boolean;
    hasBlankPick?: boolean;
  } = {},
): PlayerScore {
  return {
    id: name,
    name,
    score: { total, college, pro: total - college, proAgainstTheSpread },
    tiebreaker: { distance },
    college: [],
    pro: [],
    status: { hasNoPicks, hasBlankPick, isKnockedOut: false },
  };
}

/** The names in the order the comparator puts them, which is the row order. */
function ranked(...players: Array<PlayerScore>): Array<string> {
  return [...players].sort(comparePlayerScores).map((it) => it.name);
}

describe("comparePlayerScores", () => {
  it("ranks the higher total first", () => {
    expect(
      ranked(player("Bob", { total: 3 }), player("Alice", { total: 5 })),
    ).toEqual(["Alice", "Bob"]);
  });

  it("ranks a player who submitted no picks last, whatever their score", () => {
    // The score is the higher one, so only `hasNoPicks` can be sending them down.
    expect(
      ranked(
        player("Bob", { total: 9, hasNoPicks: true }),
        player("Alice", { total: 1 }),
      ),
    ).toEqual(["Alice", "Bob"]);
  });

  it("ranks a blank pick under a full sheet and over an empty one", () => {
    // Neither can win the week, which is why both sort under Alice. The pool still
    // ranks a player who missed one game over one who entered nothing.
    expect(
      ranked(
        player("Carol", { total: 9, hasNoPicks: true }),
        player("Bob", { total: 9, hasBlankPick: true }),
        player("Alice", { total: 1 }),
      ),
    ).toEqual(["Alice", "Bob", "Carol"]);
  });

  it("breaks a tie on total by the closer Monday night guess", () => {
    expect(
      ranked(
        player("Bob", { total: 5, distance: 7 }),
        player("Alice", { total: 5, distance: 2 }),
      ),
    ).toEqual(["Alice", "Bob"]);
  });

  it("falls through to the next tier when either guess is missing", () => {
    // Bob has a guess and Alice does not, so this tier cannot separate them and
    // the college score decides it. Treating a blank cell as any distance at all,
    // however far, would hand it to Bob instead.
    expect(
      ranked(
        player("Bob", { total: 5, college: 0, distance: 2 }),
        player("Alice", { total: 5, college: 3 }),
      ),
    ).toEqual(["Alice", "Bob"]);
  });

  it("breaks a tie on the Monday night guess by college score", () => {
    expect(
      ranked(
        player("Bob", { total: 5, college: 1, distance: 2 }),
        player("Alice", { total: 5, college: 4, distance: 2 }),
      ),
    ).toEqual(["Alice", "Bob"]);
  });

  it("breaks a tie on college score by pro picks against the spread", () => {
    expect(
      ranked(
        player("Bob", { total: 5, college: 2, proAgainstTheSpread: 1 }),
        player("Alice", { total: 5, college: 2, proAgainstTheSpread: 3 }),
      ),
    ).toEqual(["Alice", "Bob"]);
  });

  it("orders two players the tiers cannot separate by name, ignoring case", () => {
    expect(ranked(player("Zoe"), player("amy"))).toEqual(["amy", "Zoe"]);
  });
});

describe("comparePlayerScoresOnMerit", () => {
  it("leaves two players the tiers cannot separate tied", () => {
    // What the standing reads to say two players both won the week, which the
    // row order alone could never say: it separates them by name regardless.
    expect(comparePlayerScoresOnMerit(player("Zoe"), player("amy"))).toBe(0);
    expect(comparePlayerScores(player("Zoe"), player("amy"))).toBeGreaterThan(
      0,
    );
  });
});
