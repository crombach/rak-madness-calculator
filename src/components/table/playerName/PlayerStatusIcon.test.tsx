import { Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import { useIsWeekWon } from "../../../context/AppDataContext";
import PlayerStatusIcon from "./PlayerStatusIcon";

vi.mock("../../../context/AppDataContext", () => ({
  useIsWeekWon: vi.fn(),
}));

const mockIsWeekWon = useIsWeekWon as Mock;

describe("PlayerStatusIcon", () => {
  it("renders the appropriate icon based on knock-out status and week outcome", () => {
    mockIsWeekWon.mockReturnValue(false);
    const { rerender } = render(<PlayerStatusIcon isKnockedOut={false} />);
    expect(
      screen.getByTestId("SentimentVerySatisfiedOutlinedIcon"),
    ).toBeInTheDocument();

    rerender(<PlayerStatusIcon isKnockedOut />);
    expect(screen.getByTestId("SkullOutlinedIcon")).toBeInTheDocument();

    mockIsWeekWon.mockReturnValue(true);
    rerender(<PlayerStatusIcon isKnockedOut={false} />);
    expect(screen.getByTestId("EmojiEventsOutlinedIcon")).toBeInTheDocument();
  });
});
