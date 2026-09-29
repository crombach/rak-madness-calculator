import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { seasonsResponse } from "../responseTestFixtures";
import getLeagueInfo from "../utils/getLeagueInfo";
import { SEASON } from "../weekFixtures";
import { AppDataContextProvider } from "./AppDataContext";
import { SettingsContextProvider } from "./SettingsContext";
import { ToastContextProvider } from "./ToastContext";

vi.mock("../utils/getLeagueInfo", () => ({
  default: vi.fn(() => new Promise(() => {})),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

it("asks for a results URL's picks before the calendar resolves", async () => {
  const fetchMock = vi.fn(async (url: string) =>
    url === "/api/picks"
      ? seasonsResponse([SEASON], { [SEASON]: [5] })
      : new Promise<Response>(() => {}),
  );
  vi.stubGlobal("fetch", fetchMock);

  render(
    <MemoryRouter initialEntries={[`/${SEASON}/5/scoreboard`]}>
      <SettingsContextProvider>
        <ToastContextProvider>
          <AppDataContextProvider>{null}</AppDataContextProvider>
        </ToastContextProvider>
      </SettingsContextProvider>
    </MemoryRouter>,
  );

  await waitFor(() => expect(getLeagueInfo).toHaveBeenCalled());
  expect(fetchMock).toHaveBeenCalledWith(`/api/picks/${SEASON}/5`);
});
