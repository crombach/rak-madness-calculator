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

  it("draws the Scoreboard's columns in the real table's order", () => {
    render(<SkeletonTable view={RESULTS_PAGE.scoreboard} />);
    const headers = screen
      .getAllByRole("columnheader", { hidden: true })
      .map((header) => header.dataset.skeletonText);
    expect(headers).toEqual([
      "Rank",
      "Player",
      "Total Score",
      "MNF Points Pick",
      "MNF Points Distance",
      "College Score",
      "Pro Score",
      "Pro Score ATS",
    ]);
  });

  it("tells a screen reader results are loading, not ~1500 empty cells", () => {
    render(<SkeletonTable view={RESULTS_PAGE.picks} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading picks results",
    );
  });
});
