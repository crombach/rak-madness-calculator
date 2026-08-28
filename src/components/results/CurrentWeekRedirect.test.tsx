import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { Mock } from "vitest";
import { useAppData } from "../../context/AppDataContext";
import { SEASON } from "../../weekFixtures";
import CurrentWeekRedirect from "./CurrentWeekRedirect";

vi.mock("../../context/AppDataContext", () => ({
  useAppData: vi.fn(),
  useIsWeekDecided: vi.fn(() => false),
}));

const CURRENT_WEEK = 5;

/**
 * Names the URL the redirect chose, from the router's own history rather than
 * jsdom's location, which `MemoryRouter` never touches.
 */
function Landed() {
  return <span data-testid="landed">{useLocation().pathname}</span>;
}

function mount(
  view: "Scoreboard" | "Picks",
  appData: Record<string, unknown>,
): void {
  (useAppData as Mock).mockReturnValue({
    loadedSeason: SEASON,
    currentWeekNumber: CURRENT_WEEK,
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
    mount("Scoreboard", {});
    expect(landedOn()).toBe(`/${SEASON}/${CURRENT_WEEK}/scoreboard`);
  });

  it("sends /picks to the picks view of that same week", () => {
    mount("Picks", {});
    expect(landedOn()).toBe(`/${SEASON}/${CURRENT_WEEK}/picks`);
  });

  it("goes home when the schedule could not be loaded", () => {
    mount("Scoreboard", { weeks: undefined });
    expect(landedOn()).toBe("/");
  });

  it("goes home when the season has no week behind it yet", () => {
    // Between the Super Bowl and the opener, which is the case this exists for.
    mount("Scoreboard", { currentWeekNumber: undefined });
    expect(landedOn()).toBe("/");
  });

  it("shows the wireframe rather than guessing while the schedule loads", () => {
    mount("Scoreboard", { isWeeksLoading: true });
    expect(landedOn()).toBeUndefined();
    expect(screen.getByRole("table", { hidden: true })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  // This route knows no week to name yet, so the caption holds its room instead
  // of naming one. Filled in, the table below it would move when the week landed.
  it("holds the caption's room while the week is unknown", () => {
    mount("Scoreboard", { isWeeksLoading: true });
    const caption = document.querySelector(".results-caption");
    expect(caption).toBeInTheDocument();
    expect(caption).toHaveClass("--loading");
    expect(caption).toBeEmptyDOMElement();
  });
});
