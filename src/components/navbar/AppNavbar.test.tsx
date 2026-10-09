import { fireEvent, render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import doNothing from "../../utils/doNothing";
import { RESULTS_PAGE } from "../results/resultsPath";
import AppNavbar, { useAppNavbar } from "./AppNavbar";

const WEEK_STATE = {
  view: RESULTS_PAGE.scoreboard,
  onViewChange: doNothing,
  disabled: false,
  isWeekLive: false,
  season: undefined,
  week: undefined,
  pagesDisabled: false,
};

/** A page that sets the navbar, with a key that leaves it. */
function WeekPage() {
  useAppNavbar(WEEK_STATE);
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate("/other")}>
      Leave
    </button>
  );
}

function PicksPage() {
  useAppNavbar({ ...WEEK_STATE, view: RESULTS_PAGE.picks });
  return null;
}

function mountNavbar(otherPage: ReactNode) {
  render(
    <MemoryRouter initialEntries={["/week"]}>
      <Routes>
        <Route element={<AppNavbar />}>
          <Route path="/week" element={<WeekPage />} />
          <Route path="/other" element={otherPage} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function viewKey(name: string) {
  return screen.getByRole("button", { name });
}

describe("AppNavbar", () => {
  it("shows what the page on show sets", () => {
    mountNavbar(null);

    expect(viewKey("Scoreboard")).toHaveClass("--selected");
    expect(viewKey("Scoreboard")).toBeEnabled();
  });

  it("returns to its default once the page that set it unmounts", () => {
    mountNavbar(null);

    fireEvent.click(screen.getByRole("button", { name: "Leave" }));

    expect(viewKey("Scoreboard")).not.toHaveClass("--selected");
    expect(viewKey("Scoreboard")).toBeDisabled();
  });

  it("keeps the next page's state over the reset the last page leaves", () => {
    mountNavbar(<PicksPage />);

    fireEvent.click(screen.getByRole("button", { name: "Leave" }));

    expect(viewKey("Picks")).toHaveClass("--selected");
    expect(viewKey("Picks")).toBeEnabled();
  });
});
