import { Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import { useIsWeekWon } from "../../../context/AppDataContext";
import PlayerStatusIcon from "./PlayerStatusIcon";

vi.mock("../../../context/AppDataContext", () => ({
  useIsWeekWon: vi.fn(),
}));

const mockIsWeekWon = useIsWeekWon as Mock;

describe("PlayerStatusIcon", () => {
  it("marks a knocked out player with the skull, week over or not", () => {
    mockIsWeekWon.mockReturnValue(false);
    const { rerender } = render(<PlayerStatusIcon isKnockedOut />);
    expect(screen.getByTestId("SkullOutlinedIcon")).toBeInTheDocument();

    mockIsWeekWon.mockReturnValue(true);
    rerender(<PlayerStatusIcon isKnockedOut />);
    expect(screen.getByTestId("SkullOutlinedIcon")).toBeInTheDocument();
  });

  it("smiles while the week is still being played", () => {
    mockIsWeekWon.mockReturnValue(false);
    render(<PlayerStatusIcon isKnockedOut={false} />);
    expect(
      screen.getByTestId("SentimentVerySatisfiedOutlinedIcon"),
    ).toBeInTheDocument();
  });

  it("crowns whoever is left standing once the week is won", () => {
    mockIsWeekWon.mockReturnValue(true);
    render(<PlayerStatusIcon isKnockedOut={false} />);
    expect(screen.getByTestId("EmojiEventsOutlinedIcon")).toBeInTheDocument();
  });
});
