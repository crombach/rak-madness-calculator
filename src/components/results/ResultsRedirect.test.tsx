import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { SEASON } from "../../weekFixtures";
import ResultsRedirect from "./ResultsRedirect";
import { RESULTS_PAGE } from "./resultsPath";

const WEEK = 4;

// The real `Navigate` unmounts the redirect on landing, taking the wireframe
// with it. A stand-in keeps both on screen to be read.
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
    <span data-testid="navigate" data-replace={replace}>
      {to}
    </span>
  ),
}));

describe("ResultsRedirect", () => {
  it("navigates to the destination page and draws its wireframe", () => {
    render(
      <MemoryRouter initialEntries={[`/${SEASON}/${WEEK}`]}>
        <Routes>
          <Route
            path="/:season/:week"
            element={<ResultsRedirect to={RESULTS_PAGE.scoreboard} />}
          />
        </Routes>
      </MemoryRouter>,
    );
    const navigate = screen.getByTestId("navigate");
    expect(navigate).toHaveTextContent(`/${SEASON}/${WEEK}/scoreboard`);
    expect(navigate).toHaveAttribute("data-replace", "true");
    expect(document.querySelector(".table.--skeleton")).toBeInTheDocument();
  });
});
