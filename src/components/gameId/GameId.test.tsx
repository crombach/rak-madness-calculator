import { render, screen } from "@testing-library/react";
import { PropsWithChildren } from "react";
import type { Mock } from "vitest";
import { useScores } from "../../context/AppDataContext";
import {
  PLAYER_NAME_KEY,
  SettingsContextProvider,
} from "../../context/SettingsContext";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import GameId from "./GameId";

vi.mock("../../context/AppDataContext", () => ({ useScores: vi.fn() }));
vi.mock("../../utils/scoring/getPlayerAnalysis", () => ({
  getMustWin: () => ({ games: [{ label: "P1", pick: "KC -3", team: "KC" }] }),
}));
const mockScores = useScores as Mock;

function Settings({ children }: PropsWithChildren) {
  return <SettingsContextProvider>{children}</SettingsContextProvider>;
}

function renderId(label: string) {
  render(<GameId label={label} className="games__label" />, {
    wrapper: Settings,
  });
}

describe("GameId", () => {
  beforeEach(() => {
    localStorage.clear();
    mockScores.mockReturnValue({
      scores: [{ name: "Alice" }],
    } as RakMadnessScores);
  });

  it("marks and names a game the reader must win", async () => {
    localStorage.setItem(PLAYER_NAME_KEY, "Alice");
    renderId("P1");
    expect(await screen.findByText("must win")).toBeInTheDocument();
    const label = screen.getByText("P1", { exact: false });
    expect(label).toHaveClass("games__label", "--must-win");
    expect(label).toHaveTextContent("P1 must win");
  });

  it("is plain for a game the reader need not win", async () => {
    localStorage.setItem(PLAYER_NAME_KEY, "Alice");
    render(
      <>
        <GameId label="P1" className="games__label" />
        <GameId label="P2" className="games__label" />
      </>,
      { wrapper: Settings },
    );
    expect(await screen.findByText("must win")).toBeInTheDocument();
    expect(screen.getByText("P2")).not.toHaveClass("--must-win");
    expect(screen.getByText("P2")).not.toHaveTextContent("must win");
  });

  it("is plain with no name set", () => {
    renderId("P1");
    expect(screen.getByText("P1")).not.toHaveClass("--must-win");
  });
});
