import { render, screen } from "@testing-library/react";
import GamesSkeleton from "./GamesSkeleton";

describe("GamesSkeleton", () => {
  it("draws one section of eight cards under a title with no text", () => {
    render(<GamesSkeleton />);

    expect(screen.getAllByRole("list", { hidden: true })).toHaveLength(1);
    expect(screen.getAllByRole("listitem", { hidden: true })).toHaveLength(8);
    expect(document.querySelector(".games__section-title")?.textContent).toBe(
      "",
    );
  });
});
