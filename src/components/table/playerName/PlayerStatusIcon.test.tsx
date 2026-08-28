import { Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import { useIsWinnerDecided } from "../../../context/AppDataContext";
import PlayerStatusIcon from "./PlayerStatusIcon";

vi.mock("../../../context/AppDataContext", () => ({
  useIsWinnerDecided: vi.fn(),
}));

const mockIsWinnerDecided = useIsWinnerDecided as Mock;

describe("PlayerStatusIcon", () => {
  it("marks a knocked out player with the skull, week over or not", () => {
    mockIsWinnerDecided.mockReturnValue(false);
    const { rerender } = render(<PlayerStatusIcon isKnockedOut />);
    expect(screen.getByTestId("SkullOutlinedIcon")).toBeInTheDocument();

    mockIsWinnerDecided.mockReturnValue(true);
    rerender(<PlayerStatusIcon isKnockedOut />);
    expect(screen.getByTestId("SkullOutlinedIcon")).toBeInTheDocument();
  });

  it("smiles while the week is still being played", () => {
    mockIsWinnerDecided.mockReturnValue(false);
    render(<PlayerStatusIcon isKnockedOut={false} />);
    expect(
      screen.getByTestId("SentimentVerySatisfiedOutlinedIcon"),
    ).toBeInTheDocument();
  });

  it("crowns whoever is left standing once the week is over", () => {
    mockIsWinnerDecided.mockReturnValue(true);
    render(<PlayerStatusIcon isKnockedOut={false} />);
    expect(screen.getByTestId("EmojiEventsOutlinedIcon")).toBeInTheDocument();
  });
});
