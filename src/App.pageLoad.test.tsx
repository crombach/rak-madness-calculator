import { MockedFunction } from "vitest";
import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";

vi.mock("./utils/getLeagueInfo");
vi.mock("./utils/readFileToBuffer");
vi.mock("./utils/scoring/getPlayerScores");
vi.mock("./utils/buildSpreadsheetBuffer");
vi.mock("./components/games/GamesRoute", () => {
  throw new Error("chunk gone");
});

import {
  CURRENT_WEEK,
  SEASON,
  mountApp,
  spreadsheetResponse,
  setUpAppTest,
} from "./appTestFixtures";
import { PAGE_LOAD_ERROR } from "./components/results/ResultsFrame";

let fetchMock: MockedFunction<typeof fetch>;

beforeEach(() => {
  fetchMock = setUpAppTest();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the app: a page whose chunk cannot load", () => {
  // One case, since the mocked import fails only the first time it is asked for.
  it("says so in the page's place, and the next page still loads", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(spreadsheetResponse());
    mountApp(`/${SEASON}/${CURRENT_WEEK}/games`);

    expect(await screen.findByText(PAGE_LOAD_ERROR)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /scoreboard/i }));

    expect(await screen.findByText("MNF Points Pick")).toBeInTheDocument();
    expect(screen.queryByText(PAGE_LOAD_ERROR)).not.toBeInTheDocument();
  });
});
