import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import {
  SettingsContextProvider,
  Theme,
  useIsMyPlayer,
  useSettings,
} from "./SettingsContext";

const THEME_KEY = "rak-madness:settings:theme";
const PLAYER_NAME_KEY = "rak-madness:settings:playerName";

function Probe({ candidate = "Linebacher" }: { candidate?: string }) {
  const { theme, setTheme, playerName, setPlayerName } = useSettings();
  const isMine = useIsMyPlayer(candidate);
  return (
    <>
      <span data-testid="theme">{theme}</span>
      <span data-testid="playerName">{playerName}</span>
      <span data-testid="isMine">{String(isMine)}</span>
      {(["light", "dark", "auto"] as Array<Theme>).map((option) => (
        <button key={option} onClick={() => setTheme(option)}>
          {option}
        </button>
      ))}
      <button onClick={() => setPlayerName("Linebacher")}>name me</button>
    </>
  );
}

function mountProbe(candidate?: string) {
  const user = userEvent.setup();
  render(
    <SettingsContextProvider>
      <Probe candidate={candidate} />
    </SettingsContextProvider>,
  );
  return user;
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("SettingsContext, the theme", () => {
  it("follows the OS until told otherwise", () => {
    mountProbe();

    expect(screen.getByTestId("theme")).toHaveTextContent("auto");
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("names the chosen theme on the document, for index.scss to select on", async () => {
    const user = await mountProbe();
    await user.click(screen.getByRole("button", { name: "dark" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  });

  it("takes the name back off the document on the way to auto", async () => {
    const user = await mountProbe();
    await user.click(screen.getByRole("button", { name: "dark" }));
    await user.click(screen.getByRole("button", { name: "auto" }));

    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it("starts in the theme last chosen", () => {
    localStorage.setItem(THEME_KEY, "light");
    mountProbe();

    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});

describe("SettingsContext, the reader's own name", () => {
  it("saves what was typed, as it was typed", async () => {
    const user = await mountProbe();
    await user.click(screen.getByRole("button", { name: "name me" }));

    expect(screen.getByTestId("playerName")).toHaveTextContent("Linebacher");
    expect(localStorage.getItem(PLAYER_NAME_KEY)).toBe("Linebacher");
  });

  it("matches a player past case and surrounding space", () => {
    localStorage.setItem(PLAYER_NAME_KEY, "  linebacher ");
    mountProbe("Linebacher");

    expect(screen.getByTestId("isMine")).toHaveTextContent("true");
  });

  it("matches nobody where no name is saved", () => {
    mountProbe("Linebacher");

    expect(screen.getByTestId("isMine")).toHaveTextContent("false");
  });

  it("matches nobody else", () => {
    localStorage.setItem(PLAYER_NAME_KEY, "Linebacher");
    mountProbe("Barb Wire");

    expect(screen.getByTestId("isMine")).toHaveTextContent("false");
  });
});
