import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { PlayerScore, RakMadnessScores } from "../../../types/RakMadnessScores";
import { PlayerAnalysisContextProvider } from "../../../context/PlayerAnalysisContext";
import {
  PLAYER_NAME_KEY,
  SettingsContextProvider,
} from "../../../context/SettingsContext";
import { playerScore } from "../../../weekFixtures";
import ScoresTable from "./ScoresTable";

const showPlayerAnalysis = vi.fn();

function player(overrides: Partial<PlayerScore> = {}): PlayerScore {
  return playerScore({
    status: { hasNoPicks: false, isKnockedOut: false, explanation: "Winner!" },
    ...overrides,
  });
}

const knockedOutBob = player({
  name: "Bob",
  score: { total: 1, college: 0, pro: 1, proAgainstTheSpread: 0 },
  tiebreaker: { pick: 45, distance: 4 },
  status: {
    hasNoPicks: false,
    isKnockedOut: true,
    explanation: "Knocked out on Total Score by Alice.",
  },
});

function mountTable(scores?: RakMadnessScores) {
  return render(
    <SettingsContextProvider>
      <PlayerAnalysisContextProvider showPlayerAnalysis={showPlayerAnalysis}>
        <ScoresTable scores={scores} />
      </PlayerAnalysisContextProvider>
    </SettingsContextProvider>,
  );
}

// The provider seeds itself from storage as it mounts, so a name written here is
// the reader's by the time the table renders.
function saveMyName(name: string) {
  localStorage.setItem(PLAYER_NAME_KEY, name);
}

beforeEach(() => {
  localStorage.clear();
});

const bothPlayers: RakMadnessScores = {
  tiebreaker: 41,
  scores: [player(), knockedOutBob],
};

describe("ScoresTable", () => {
  it("renders nothing without scores", () => {
    mountTable(undefined);
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("renders the score columns", () => {
    mountTable(bothPlayers);
    const headers = screen
      .getAllByRole("columnheader")
      .map((header) => header.textContent);
    expect(headers).toEqual([
      "Rank",
      "Player",
      "MNF Points Pick",
      "MNF Points Distance",
      "College Score",
      "Pro Score",
      "Pro Score ATS",
      "Total Score",
    ]);
  });

  it("marks every header cell with its column scope", () => {
    mountTable(bothPlayers);
    screen
      .getAllByRole("columnheader")
      .forEach((header) => expect(header).toHaveAttribute("scope", "col"));
  });

  it("names the table for a screen reader", () => {
    mountTable(bothPlayers);
    expect(screen.getByRole("table")).toHaveAccessibleName(
      "Player rankings for the week, by total score",
    );
  });

  it("renders one row per player, in the order given", () => {
    mountTable(bothPlayers);
    const names = screen
      .getAllByRole("button")
      .map((cell) => cell.querySelector(".player-name__name")?.textContent);
    expect(names).toEqual(["Alice", "Bob"]);
  });

  it("renders each player's rank and scores", () => {
    mountTable(bothPlayers);
    const cells = screen.getAllByRole("row")[1].querySelectorAll("td, th");
    const texts = Array.from(cells).map((cell) =>
      (cell.querySelector(".player-name__name") ?? cell).textContent?.trim(),
    );
    expect(texts).toEqual(["1", "Alice", "41", "0", "1", "2", "1", "3"]);
  });

  it("shows N/A when a player has no tiebreaker pick", () => {
    mountTable({
      tiebreaker: 41,
      scores: [
        player({
          tiebreaker: {
            pick: undefined as unknown as number,
            distance: undefined as unknown as number,
          },
        }),
      ],
    });
    expect(screen.getAllByText("N/A")).toHaveLength(2);
  });

  it("marks a knocked-out player's name cell", () => {
    mountTable(bothPlayers);
    const [alice, bob] = screen.getAllByRole("button");
    expect(alice.closest("td")?.className).not.toContain("--knocked-out");
    expect(bob.closest("td")?.className).toContain("--knocked-out");
  });

  it("opens the player analysis when a name is clicked", async () => {
    mountTable(bothPlayers);
    await userEvent.click(screen.getByRole("button", { name: /Bob/ }));
    expect(showPlayerAnalysis).toHaveBeenCalledWith("Bob");
  });

  // `PlayerName` draws this for both tables, so only one of them checks it.
  it("announces a player's status for a screen reader", () => {
    mountTable(bothPlayers);
    const [alice, bob] = screen.getAllByRole("button");
    expect(alice).toHaveTextContent("Still in contention");
    expect(bob).toHaveTextContent("Knocked out");
  });

  it("marks the reader's own row, whatever case they saved their name in", () => {
    saveMyName("  alice ");
    mountTable(bothPlayers);
    const [alice, bob] = screen.getAllByRole("button");
    expect(alice.closest("td")?.className).toContain("--mine");
    expect(alice.closest("td")?.className).not.toContain("--knocked-out");
    expect(bob.closest("td")?.className).not.toContain("--mine");
  });

  it("marks nobody's row where no name is saved", () => {
    mountTable(bothPlayers);
    screen.getAllByRole("button").forEach((cellButton) => {
      expect(cellButton.closest("td")?.className).not.toContain("--mine");
    });
  });

  it("announces the reader's own row for a screen reader", () => {
    saveMyName("Alice");
    mountTable(bothPlayers);
    const [alice, bob] = screen.getAllByRole("button");
    expect(alice).toHaveTextContent("Your row");
    expect(bob).not.toHaveTextContent("Your row");
  });
});
