import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { Mock } from "vitest";
import { useCalendar } from "../../context/AppDataContext";
import { SEASON } from "../../weekFixtures";
import CurrentWeekRedirect from "./CurrentWeekRedirect";
import { RESULTS_PAGE, ScoresView } from "./resultsPath";

vi.mock("../../context/AppDataContext", () => ({
  useCalendar: vi.fn(),
  useScores: vi.fn(() => undefined),
  useIsWeekSettled: vi.fn(() => false),
  useIsWeekWon: vi.fn(() => false),
  useKnockouts: vi.fn(() => undefined),
}));

const CURRENT_WEEK = 5;
const DEFAULT_WEEK = 3;

/**
 * Names the URL the redirect chose, from the router's own history rather than
 * jsdom's location, which `MemoryRouter` never touches.
 */
function Landed() {
  return <span data-testid="landed">{useLocation().pathname}</span>;
}

function mount(view: ScoresView, appData: Record<string, unknown>): void {
  (useCalendar as Mock).mockReturnValue({
    loadedSeason: SEASON,
    currentWeekNumber: CURRENT_WEEK,
    defaultWeekNumber: CURRENT_WEEK,
    weeks: [{ value: CURRENT_WEEK }],
    isWeeksLoading: false,
    ...appData,
  });
  const path = `/${view.toLowerCase()}`;
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={<CurrentWeekRedirect view={view} />} />
        <Route path="*" element={<Landed />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Where the redirect landed, or undefined while it is still deciding. */
function landedOn(): string | undefined {
  return screen.queryByTestId("landed")?.textContent;
}

describe("CurrentWeekRedirect", () => {
  it("sends /scoreboard to the current week of the season on hand", () => {
    mount(RESULTS_PAGE.scoreboard, {});
    expect(landedOn()).toBe(`/${SEASON}/${CURRENT_WEEK}/scoreboard`);
  });

  it("sends /picks to the picks view of that same week", () => {
    mount(RESULTS_PAGE.picks, {});
    expect(landedOn()).toBe(`/${SEASON}/${CURRENT_WEEK}/picks`);
  });

  it("lands on the newest week with picks, not the week ESPN has reached", () => {
    mount(RESULTS_PAGE.scoreboard, { defaultWeekNumber: DEFAULT_WEEK });
    expect(landedOn()).toBe(`/${SEASON}/${DEFAULT_WEEK}/scoreboard`);
  });

  it("goes home when the schedule could not be loaded", () => {
    mount(RESULTS_PAGE.scoreboard, { weeks: undefined });
    expect(landedOn()).toBe("/");
  });

  it("goes home when the season has no week behind it yet", () => {
    // Between the Super Bowl and the opener, which is the case this exists for.
    mount(RESULTS_PAGE.scoreboard, { defaultWeekNumber: undefined });
    expect(landedOn()).toBe("/");
  });

  it("shows the wireframe rather than guessing while the schedule loads", () => {
    mount(RESULTS_PAGE.scoreboard, { isWeeksLoading: true });
    expect(landedOn()).toBeUndefined();
    expect(screen.getByRole("table", { hidden: true })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  // This route knows no week to name yet, so the caption holds its room instead
  // of naming one. Filled in, the table below it would move when the week landed.
  it("holds the caption's room while the week is unknown", () => {
    mount(RESULTS_PAGE.scoreboard, { isWeeksLoading: true });
    const caption = document.querySelector(".results-caption");
    expect(caption).toBeInTheDocument();
    expect(caption).toHaveClass("--loading");
    expect(caption).toBeEmptyDOMElement();
  });
});
