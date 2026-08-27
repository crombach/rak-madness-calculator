import { MockedFunction } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AppDataContextProvider } from "./context/AppDataContext";
import { SettingsContextProvider } from "./context/SettingsContext";
import { ToastContextProvider } from "./context/ToastContext";
import { League, LeagueInfo, SeasonType } from "./types/League";
import { SEASON, week } from "./weekFixtures";
import { RakMadnessScores } from "./types/RakMadnessScores";
import App from "./App";
import Toaster from "./components/toaster/Toaster";

import getLeagueInfo from "./utils/getLeagueInfo";
import { readFileToBuffer } from "./utils/readFileToBuffer";
import buildSpreadsheetBuffer, {
  XLSX_CONTENT_TYPE,
} from "./utils/buildSpreadsheetBuffer";
import { getPlayerScores } from "./utils/scoring/getPlayerScores";

// Each test file calls its own `vi.mock` for these paths (mocks are hoisted per
// file, so a mock declared here would not reach the importing test file). These
// casts only resolve to the mocked functions once that has happened.
export const getLeagueInfoMock = getLeagueInfo as MockedFunction<
  typeof getLeagueInfo
>;
export const getPlayerScoresMock = getPlayerScores as MockedFunction<
  typeof getPlayerScores
>;
export const readFileToBufferMock = readFileToBuffer as MockedFunction<
  typeof readFileToBuffer
>;
export const buildSpreadsheetBufferMock =
  buildSpreadsheetBuffer as MockedFunction<typeof buildSpreadsheetBuffer>;

export const CURRENT_WEEK = 3;
export { SEASON, week };

export const weeks = [week(1), week(2), week(3), week(4), week(5)];

export const leagueInfo: LeagueInfo = {
  league: League.PRO,
  season: SEASON,
  activeCalendar: {
    seasonType: SeasonType.REGULAR,
    startDate: new Date(2024, 8, 1),
    endDate: new Date(2025, 0, 1),
    weeks,
  },
  // Same object as the matching entry in `weeks`, which is what the week Select
  // compares against.
  activeWeek: weeks[CURRENT_WEEK - 1],
  calendars: [],
};

export const scores: RakMadnessScores = {
  tiebreaker: 47,
  scores: [
    {
      name: "Alice",
      score: { total: 5, college: 2, pro: 3, proAgainstTheSpread: 3 },
      tiebreaker: { pick: 45, distance: 2 },
      college: [
        {
          pick: "MICH",
          status: "yes",
          explanation: { header: "C1", message: "won" },
        },
      ],
      pro: [
        {
          pick: "BUF",
          status: "yes",
          explanation: { header: "P1", message: "won" },
        },
      ],
      status: { hasNoPicks: false, isKnockedOut: false },
    },
  ],
};

/** The same week with a game still to be played, so it is not over yet. */
export const openWeekScores: RakMadnessScores = {
  ...scores,
  scores: [
    {
      ...scores.scores[0],
      pro: [
        {
          pick: "BUF",
          status: "incomplete",
          explanation: { header: "P1", message: "kicks off later" },
        },
      ],
    },
  ],
};

/** Mirrors index.tsx, with the entry URL as a parameter. */
export function mountApp(path = "/") {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <SettingsContextProvider>
        <ToastContextProvider>
          <AppDataContextProvider>
            <App />
          </AppDataContextProvider>
          <Toaster />
        </ToastContextProvider>
      </SettingsContextProvider>
    </MemoryRouter>,
  );
  return user;
}

/** The app only renders its controls once the ESPN week lookup resolves. */
export async function mountLoadedApp(path = "/") {
  const user = mountApp(path);
  await screen.findByText("Use Local Spreadsheet");
  return user;
}

export function fileInput(): HTMLInputElement {
  // The input is hidden behind a button, so target it directly.
  return document.querySelector("input[type=file]") as HTMLInputElement;
}

export async function uploadSpreadsheet(
  user: ReturnType<typeof userEvent.setup>,
) {
  const file = new File(["picks"], "picks.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  await user.upload(fileInput(), file);
}

/**
 * Refresh, Scoreboard, Picks, in the order `ScoresNavbar` renders them. Refresh is
 * there only while the week is live, so index into this by name rather than by
 * position.
 */
export function scoresHeaderButtons(): Array<HTMLElement> {
  return Array.from(
    document.querySelectorAll<HTMLElement>(".scores-nav__button"),
  );
}

/** The line over the table naming the week, which carries no role of its own. */
export function resultsCaption(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".results-caption");
}

export function notFoundResponse(): Response {
  return new Response(null, { status: 404 });
}

export function htmlResponse(): Response {
  return new Response("<!doctype html><title>Rakulator</title>", {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}

export function seasonsResponse(years: Array<number>): Response {
  return new Response(JSON.stringify({ years }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

/** Answers the seasons list, and everything else the way the case asked for. */
export function routedFetch(
  picks: () => Response,
  years = [SEASON, SEASON - 1],
) {
  return vi.fn((input: RequestInfo | URL) =>
    Promise.resolve(
      String(input) === "/api/picks" ? seasonsResponse(years) : picks(),
    ),
  ) as unknown as MockedFunction<typeof fetch>;
}

export function spreadsheetResponse(): Response {
  return new Response(new ArrayBuffer(8), {
    status: 200,
    headers: { "content-type": XLSX_CONTENT_TYPE },
  });
}

/** Resets mock state before a case. Each test file calls this in its own `beforeEach`. */
export function setUpAppTest(): MockedFunction<typeof fetch> {
  vi.clearAllMocks();
  // An upload caches its workbook, and jsdom keeps localStorage between cases,
  // so without this a later case finds picks an earlier one left behind.
  localStorage.clear();
  getLeagueInfoMock.mockResolvedValue(leagueInfo);
  getPlayerScoresMock.mockResolvedValue(scores);
  readFileToBufferMock.mockResolvedValue(new ArrayBuffer(8));
  buildSpreadsheetBufferMock.mockResolvedValue(new ArrayBuffer(8));
  const fetchMock = vi
    .fn()
    .mockResolvedValue(notFoundResponse()) as MockedFunction<typeof fetch>;
  global.fetch = fetchMock;
  window.URL.createObjectURL = vi.fn(() => "blob:fake");
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  return fetchMock;
}
