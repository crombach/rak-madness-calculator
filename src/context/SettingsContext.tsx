import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { readSetting, writeSetting } from "../utils/settingsStore";

export type Theme = "light" | "dark" | "auto";

const THEME_KEY = "theme";
const PLAYER_NAME_KEY = "playerName";

/** Follow the operating system, which is what the app did before it could be told. */
const DEFAULT_THEME: Theme = "auto";

/**
 * The navbar's own fill in each theme, for the browser chrome bar to match. Read
 * off `--rak-primary-500` in `index.scss`, whose light and dark values these are.
 *
 * Copied rather than read back off the document, because only one theme's value is
 * resolved there at a time and this has to name the other one too. That makes them
 * two literals to keep in step with the stylesheet by hand.
 */
const THEME_COLOR: Record<"light" | "dark", string> = {
  light: "#eaeaea",
  dark: "#4f4f4f",
};

type Settings = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /**
   * What the reader is called in the picks sheet, or the empty string for a reader
   * who has not said. Kept as typed, since it is theirs to read back.
   */
  playerName: string;
  setPlayerName: (name: string) => void;
};

const doNothing = () => undefined;

// Defaults rather than a throw, following `PlayerAnalysisContext`: the tables read
// this per row and both suites mount them on their own, with no provider above.
const SettingsContext = createContext<Settings>({
  theme: DEFAULT_THEME,
  setTheme: doNothing,
  playerName: "",
  setPlayerName: doNothing,
});

function storedTheme(): Theme {
  const saved = readSetting(THEME_KEY);
  return saved === "light" || saved === "dark" ? saved : DEFAULT_THEME;
}

/**
 * Which theme the document is in, as an attribute `index.scss` selects on, and as
 * the color the browser paints its own chrome in.
 *
 * `auto` clears the attribute rather than resolving the OS preference here, so the
 * media query stays the only thing reading that signal and a reader who changes it
 * mid-session is followed without a listener.
 */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "auto") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = theme;
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (!(meta instanceof HTMLMetaElement)) return;
  if (theme === "auto") {
    // Back to the one value both schemes have always shared. A `media` attribute
    // would say more, but only until an explicit choice contradicted it.
    meta.content = THEME_COLOR.dark;
  } else {
    meta.content = THEME_COLOR[theme];
  }
}

export function SettingsContextProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<Theme>(storedTheme);
  const [playerName, setPlayerNameState] = useState<string>(
    () => readSetting(PLAYER_NAME_KEY) ?? "",
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    writeSetting(THEME_KEY, next === DEFAULT_THEME ? "" : next);
  }, []);

  const setPlayerName = useCallback((next: string) => {
    setPlayerNameState(next);
    writeSetting(PLAYER_NAME_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, playerName, setPlayerName }),
    [theme, setTheme, playerName, setPlayerName],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): Settings {
  return useContext(SettingsContext);
}

/**
 * Whether a player in a table is the reader themselves.
 *
 * Trimmed and case-folded, which nothing else comparing these names is: they come
 * out of the picks sheet as whoever typed them left them, and every other consumer
 * matches one sheet value against another with `===`. This one matches a sheet
 * value against something a reader typed from memory.
 */
export function useIsMyPlayer(name: string): boolean {
  const { playerName } = useSettings();
  const mine = playerName.trim().toLowerCase();
  return mine !== "" && name.trim().toLowerCase() === mine;
}
