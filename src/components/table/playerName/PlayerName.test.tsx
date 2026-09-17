import { Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  useIsWinnerDecided,
  useScoreChanges,
} from "../../../context/AppDataContext";
import {
  LIVE_ANALYSIS_KEY,
  SettingsContextProvider,
} from "../../../context/SettingsContext";
import { PlayerAnalysisContextProvider } from "../../../context/PlayerAnalysisContext";
import { NO_SCORE_CHANGES } from "../../../utils/scoring/scoreChanges";
import { playerScore } from "../../../weekFixtures";
import PlayerName from "./PlayerName";

vi.mock("../../../context/AppDataContext", () => ({
  useIsWinnerDecided: vi.fn(),
  useScoreChanges: vi.fn(),
}));

const mockIsWinnerDecided = useIsWinnerDecided as Mock;
const mockScoreChanges = useScoreChanges as Mock;

const knockedOut = playerScore({
  // Named, because a change is keyed by the row rather than by the name.
  id: "7",
  name: "Bob",
  status: { hasNoPicks: false, isKnockedOut: true },
});

/** What a refresh that just knocked Bob out leaves behind. */
const knockoutChange = {
  players: new Map([[knockedOut.id, false]]),
  picks: new Map(),
};

function mountCell(player = knockedOut) {
  return render(
    <SettingsContextProvider>
      <PlayerAnalysisContextProvider showPlayerAnalysis={vi.fn()}>
        <table>
          <tbody>
            <tr>
              <PlayerName player={player} />
            </tr>
          </tbody>
        </table>
      </PlayerAnalysisContextProvider>
    </SettingsContextProvider>,
  );
}

function cell(): HTMLElement {
  return screen.getByRole("cell");
}

beforeEach(() => {
  localStorage.clear();
  mockIsWinnerDecided.mockReturnValue(false);
  mockScoreChanges.mockReturnValue(NO_SCORE_CHANGES);
});

describe("PlayerName", () => {
  it("opens the analysis and marks the status while the analysis is live", () => {
    mountCell();

    expect(screen.getByRole("button", { name: /Bob/ })).toBeInTheDocument();
    expect(screen.getByTestId("SkullOutlinedIcon")).toBeInTheDocument();
    expect(cell()).toHaveClass("--knocked-out");
  });

  it("says only the name once a reader turns the live analysis off", () => {
    localStorage.setItem(LIVE_ANALYSIS_KEY, "off");
    mountCell();

    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByTestId("SkullOutlinedIcon")).toBeNull();
    expect(screen.queryByText("Knocked out")).toBeNull();
    expect(cell()).not.toHaveClass("--knocked-out");
    expect(cell()).toHaveClass("--no-status");
  });

  it("tells a reader who turned it off how a decided week went", () => {
    localStorage.setItem(LIVE_ANALYSIS_KEY, "off");
    mockIsWinnerDecided.mockReturnValue(true);
    mountCell();

    expect(screen.getByRole("button", { name: /Bob/ })).toBeInTheDocument();
    expect(screen.getByTestId("SkullOutlinedIcon")).toBeInTheDocument();
    expect(cell()).toHaveClass("--knocked-out");
    expect(cell()).not.toHaveClass("--no-status");
  });

  it("holds back the flash a knockout would otherwise draw", () => {
    localStorage.setItem(LIVE_ANALYSIS_KEY, "off");
    mockScoreChanges.mockReturnValue(knockoutChange);
    mountCell();

    expect(cell().querySelector(".table__cell-wipe")).toBeNull();
  });

  it("wipes the icon a player held away from the one they hold now", () => {
    mockScoreChanges.mockReturnValue(knockoutChange);
    mountCell();

    const wipe = cell().querySelector(".table__cell-wipe");
    expect(wipe).not.toBeNull();
    // The face they wore in contention, uncovering the skull they wear now.
    expect(
      wipe?.querySelector("[data-testid='SentimentVerySatisfiedOutlinedIcon']"),
    ).not.toBeNull();
    expect(screen.getByTestId("SkullOutlinedIcon")).toBeInTheDocument();
  });

  it("draws no trophy under a wipe the deciding knockout left", () => {
    // The week reads as over the moment this knockout lands, and the player it
    // knocked out is not the one left standing.
    mockIsWinnerDecided.mockReturnValue(true);
    mockScoreChanges.mockReturnValue(knockoutChange);
    mountCell();

    const wipe = cell().querySelector(".table__cell-wipe");
    expect(
      wipe?.querySelector("[data-testid='EmojiEventsOutlinedIcon']"),
    ).toBeNull();
    expect(
      wipe?.querySelector("[data-testid='SentimentVerySatisfiedOutlinedIcon']"),
    ).not.toBeNull();
  });
});
