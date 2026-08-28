import { render, screen } from "@testing-library/react";
import { PlayerScore, RakMadnessScores } from "../../types/RakMadnessScores";
import { playerScore } from "../../weekFixtures";
import Standing from "./Standing";

describe("Standing", () => {
  /** Whole standing, whose headline is drawn apart from the tail it sits before. */
  function standingText(): string {
    return document.querySelector(".analysis__standing")?.textContent ?? "";
  }

  /** One game already settled and one still open, which is a week under way. */
  function player(name: string, total: number, pick: string): PlayerScore {
    const result = (status: PlayerScore["pro"][number]["status"]) => ({
      pick,
      status,
      explanation: { header: "", message: "" },
    });
    return playerScore({
      name,
      score: { total, college: 0, pro: total, proAgainstTheSpread: 0 },
      tiebreaker: {},
      pro: [result("yes"), result("incomplete")],
    });
  }

  const scores: RakMadnessScores = {
    scores: [player("Rak", 3, "KC -3"), player("Alice", 1, "DEN +3")],
  };

  it("says nothing until the scores hold the player picked", () => {
    // A name the week does not hold, then a name with no week behind it yet.
    const { container: withoutPlayer } = render(
      <Standing scores={scores} playerName="Nobody" />,
    );
    expect(withoutPlayer).toBeEmptyDOMElement();

    const { container: withoutScores } = render(<Standing playerName="Rak" />);
    expect(withoutScores).toBeEmptyDOMElement();
  });

  it("counts the player picked back to the leader", () => {
    render(<Standing scores={scores} playerName="Alice" />);

    expect(standingText()).toBe("2 points behind Rak · 1 game still to play");
  });

  it("ties the player picked to the lead where they hold it", () => {
    render(<Standing scores={scores} playerName="Rak" />);

    expect(standingText()).toBe("Tied for the lead · 1 game still to play");
  });

  /** The same week with nothing left open, which is a week that has a winner. */
  function finished(week: RakMadnessScores): RakMadnessScores {
    return {
      scores: week.scores.map((it) => ({
        ...it,
        pro: it.pro.map((pick) => ({ ...pick, status: "yes" as const })),
      })),
    };
  }

  it("calls the player picked the winner rather than tied for the lead", () => {
    render(<Standing scores={finished(scores)} playerName="Rak" />);

    expect(standingText()).toBe("Winner · Week complete");
  });

  it("ties the player picked for the win where the top is shared", () => {
    const tied: RakMadnessScores = {
      scores: [...scores.scores, player("Bill", 3, "KC -3")],
    };
    render(<Standing scores={finished(tied)} playerName="Rak" />);

    expect(standingText()).toBe("Tied for the win · Week complete");
  });

  /** Level on points, told apart by the Monday night tiebreaker. */
  function separated(week: RakMadnessScores): RakMadnessScores {
    return {
      scores: week.scores.map((it, index) => ({
        ...it,
        tiebreaker: { pick: 40, distance: index },
      })),
    };
  }

  const separatedWeek = separated(
    finished({
      scores: [player("Rak", 3, "KC -3"), player("Bill", 3, "KC -3")],
    }),
  );

  it("calls the player picked the winner where they took the tiebreaker", () => {
    render(<Standing scores={separatedWeek} playerName="Rak" />);

    // Level on points with Bill, so only the tiebreaker makes this one winner.
    expect(standingText()).toBe("Winner · Week complete");
  });

  it("says the player picked lost the tiebreaker rather than tied for the win", () => {
    render(<Standing scores={separatedWeek} playerName="Bill" />);

    expect(standingText()).toBe("Loses the tiebreaker to Rak · Week complete");
  });

  it("calls a clinched player the winner even where games remain", () => {
    render(
      <Standing
        scores={scores}
        playerName="Rak"
        result={{ kind: "clinched", player: "Rak" }}
      />,
    );

    expect(standingText()).toBe("Winner · 1 game still to play");
  });

  it("ties a clinched player for the win where the top is shared", () => {
    const tied: RakMadnessScores = {
      scores: [...scores.scores, player("Bill", 3, "KC -3")],
    };
    render(
      <Standing
        scores={tied}
        playerName="Rak"
        result={{ kind: "clinched", player: "Rak" }}
      />,
    );

    expect(standingText()).toBe("Tied for the win · 1 game still to play");
  });

  it("ignores a clinch that answers for a different player", () => {
    render(
      <Standing
        scores={scores}
        playerName="Rak"
        result={{ kind: "clinched", player: "Alice" }}
      />,
    );

    expect(standingText()).toBe("Tied for the lead · 1 game still to play");
  });

  /** The same week with one player out of it. */
  function knockedOut(week: RakMadnessScores, name: string): RakMadnessScores {
    return {
      scores: week.scores.map((it) =>
        it.name === name
          ? { ...it, status: { ...it.status, isKnockedOut: true } }
          : it,
      ),
    };
  }

  it("says a knocked out player is knocked out, and leaves the points to the answer", () => {
    render(
      <Standing scores={knockedOut(scores, "Alice")} playerName="Alice" />,
    );

    expect(standingText()).toBe("Knocked out · 1 game still to play");
  });

  it("colors a win and a knockout, and leaves an open standing plain", () => {
    const { rerender } = render(
      <Standing scores={finished(scores)} playerName="Rak" />,
    );
    expect(screen.getByText("Winner")).toHaveClass("--won");

    rerender(
      <Standing scores={knockedOut(scores, "Alice")} playerName="Alice" />,
    );
    expect(screen.getByText("Knocked out")).toHaveClass("--knocked-out");

    rerender(<Standing scores={scores} playerName="Rak" />);
    expect(screen.getByText("Tied for the lead")).not.toHaveClass(
      "--won",
      "--knocked-out",
    );
  });

  /** One game nobody could be scored on, which is a hole in a week otherwise done. */
  function withUnscoreableGame(week: RakMadnessScores): RakMadnessScores {
    return {
      scores: week.scores.map((it) => ({
        ...it,
        pro: [
          {
            ...it.pro[0],
            status: "unscoreable" as const,
            explanation: { header: "Invalid Spread", message: "" },
          },
          ...it.pro.slice(1),
        ],
      })),
    };
  }

  it("does not call a week complete while a game cannot be scored", () => {
    render(
      <Standing
        scores={withUnscoreableGame(finished(scores))}
        playerName="Rak"
      />,
    );

    // Not the winner: a week with a hole in it has no result to state yet.
    expect(standingText()).toBe(
      "Tied for the lead · 1 game could not be scored",
    );
  });

  it("counts a blank cell as the player's own, not a hole in the week", () => {
    const blank: RakMadnessScores = {
      scores: finished(scores).scores.map((it, index) => ({
        ...it,
        pro:
          index === 0
            ? it.pro
            : [
                {
                  ...it.pro[0],
                  status: "unscoreable" as const,
                  explanation: { header: "Missing Pick", message: "" },
                },
                ...it.pro.slice(1),
              ],
      })),
    };
    render(<Standing scores={blank} playerName="Rak" />);

    expect(standingText()).toBe("Winner · Week complete");
  });

  it("says no game has been played rather than ranking anyone", () => {
    const fresh: RakMadnessScores = {
      scores: scores.scores.map((it) => ({
        ...it,
        score: { total: 0, college: 0, pro: 0, proAgainstTheSpread: 0 },
        pro: it.pro.map((pick) => ({ ...pick, status: "incomplete" as const })),
      })),
    };
    render(<Standing scores={fresh} playerName="Rak" />);

    expect(standingText()).toBe("No finished games · 2 games still to play");
  });
});
