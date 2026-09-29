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

  it("shapes the scoreboard wireframe like the scoreboard", () => {
    render(<SkeletonTable view={RESULTS_PAGE.scoreboard} />);
    expect(
      document.querySelectorAll(".table.--skeleton thead th"),
    ).toHaveLength(8);
  });

  it("gives the picks wireframe a column per game of a middling week", () => {
    // Rank, player, and three score columns, plus a middling week's worth of
    // games. The real count is not known until the picks have been read.
    render(<SkeletonTable view={RESULTS_PAGE.picks} />);
    expect(
      document.querySelectorAll(".table.--skeleton thead th"),
    ).toHaveLength(24);
  });

  it("stands in for a field the window cannot show at once", () => {
    render(<SkeletonTable view={RESULTS_PAGE.picks} />);
    // Which players played is a thing the wireframe cannot know, so it holds no
    // rows of its own and the filler carries the whole table.
    expect(
      document.querySelectorAll(
        ".table.--skeleton tbody tr:not(.table__last-row):not(.table__filler-row)",
      ),
    ).toHaveLength(0);
    // `PLAYER_COUNT`, the usual field the wireframe stands in for, which is more
    // than a screen shows at once up to 4K. jsdom measures nothing, so the floor is
    // the whole count here and the measuring is `useFillerRows`'s own test.
    expect(document.querySelectorAll(".table__filler-row")).toHaveLength(60);
  });
});
