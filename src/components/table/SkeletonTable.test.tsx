import { render, screen } from "@testing-library/react";
import { RESULTS_PAGE } from "../results/resultsPath";
import SkeletonTable from "./SkeletonTable";

describe("SkeletonTable", () => {
  it("marks the wireframe hidden and busy for a screen reader", () => {
    render(<SkeletonTable view={RESULTS_PAGE.scoreboard} />);
    const table = screen.getByRole("table", { hidden: true });
    expect(table).toHaveAttribute("aria-hidden", "true");
    expect(table).toHaveAttribute("aria-busy", "true");
  });

  it("tells a screen reader results are loading, not ~1500 empty cells", () => {
    render(<SkeletonTable view={RESULTS_PAGE.picks} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading picks results",
    );
  });
});
