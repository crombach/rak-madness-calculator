import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import doNothing from "../utils/doNothing";
import { PREFIX, readSetting, writeSetting } from "../utils/settingsStore";

export type Theme = "light" | "dark" | "auto";

const THEME_SETTING = "theme";
const PLAYER_NAME_SETTING = "playerName";
const LIVE_ANALYSIS_SETTING = "liveAnalysis";

/** The exact key `settingsStore` writes to, for a test that reads localStorage directly. */
export const THEME_KEY = PREFIX + THEME_SETTING;
export const PLAYER_NAME_KEY = PREFIX + PLAYER_NAME_SETTING;
export const LIVE_ANALYSIS_KEY = PREFIX + LIVE_ANALYSIS_SETTING;

/** The only value this setting is ever stored as, the default being stored as nothing. */
const LIVE_ANALYSIS_OFF = "off";

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
  /**
   * Whether a week still being played says where each player stands. Off, the
   * tables mark nobody and open nothing until the week is decided, for a reader
   * who would rather watch the games than be told how they end.
   */
  liveAnalysis: boolean;
  setLiveAnalysis: (enabled: boolean) => void;
};

// Defaults rather than a throw, following `PlayerAnalysisContext`: the tables read
// this per row and both suites mount them on their own, with no provider above.
const SettingsContext = createContext<Settings>({
  theme: DEFAULT_THEME,
  setTheme: doNothing,
  playerName: "",
  setPlayerName: doNothing,
  liveAnalysis: true,
  setLiveAnalysis: doNothing,
});

function storedTheme(): Theme {
  const saved = readSetting(THEME_SETTING);
  return saved === "light" || saved === "dark" ? saved : DEFAULT_THEME;
}

/**
 * On unless it was turned off, which is what the app did before it could be told.
 * Anything else stored reads as on, the same way an unparseable theme does.
 */
function storedLiveAnalysis(): boolean {
  return readSetting(LIVE_ANALYSIS_SETTING) !== LIVE_ANALYSIS_OFF;
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The frame that clears the freeze below, while one is outstanding. */
let thaw: number | undefined;

/**
 * Hold every transition still across the frame a theme change repaints in.
 *
 * Set before the change and in the same synchronous block, so the browser never
 * computes a style between the old token values and the new ones, and nothing
 * has an old value to ease away from. Cleared two frames later, after the new
 * values are the resting style and there is nothing left to animate.
 *
 * Two frames rather than one, because the first only guarantees the change was
 * taken, not that it was painted.
 *
 * `index.scss` holds the rule this attribute turns on.
 */
function freezeTransitions(): void {
  const root = document.documentElement;
  root.dataset.themeSwitching = "";
  // A second change inside the two frames the first one holds would otherwise
  // let the first one's clear land while the second one's colors are still on
  // their way in, and that lifts the freeze the second change asked for.
  if (thaw !== undefined) window.cancelAnimationFrame(thaw);
  thaw = window.requestAnimationFrame(() => {
    thaw = window.requestAnimationFrame(() => {
      thaw = undefined;
      delete root.dataset.themeSwitching;
    });
  });
}

/**
 * Which theme the document is in, as an attribute `index.scss` selects on.
 *
 * `auto` clears the attribute rather than resolving the OS preference here, so the
 * media query stays the only thing reading that signal and a reader who changes it
 * mid-session is followed without a listener.
 */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  freezeTransitions();
  if (theme === "auto") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = theme;
  }
}

/**
 * The color the browser paints its own chrome in, which no stylesheet can say.
 *
 * `auto` has to resolve the OS preference here, unlike the attribute above. The
 * default is `auto`, so leaving this on the dark value stood a dark chrome bar over
 * a light navbar for every reader who never opened the settings at all.
 */
function applyThemeColor(theme: Theme): void {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!(meta instanceof HTMLMetaElement)) return;
  const resolved =
    theme === "auto"
      ? window.matchMedia(DARK_QUERY).matches
        ? "dark"
        : "light"
      : theme;
  meta.content = THEME_COLOR[resolved];
}

export function SettingsContextProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<Theme>(storedTheme);
  const [playerName, setPlayerNameState] = useState<string>(
    () => readSetting(PLAYER_NAME_SETTING) ?? "",
  );
  const [liveAnalysis, setLiveAnalysisState] =
    useState<boolean>(storedLiveAnalysis);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Watched rather than read once, since on `auto` the answer changes with the OS
  // and nothing else is reading that signal for the chrome bar.
  useEffect(() => {
    applyThemeColor(theme);
    if (theme !== "auto") return;
    const dark = window.matchMedia(DARK_QUERY);
    // The OS flip repaints the same tokens `applyTheme` does, by media query
    // rather than by attribute, so it needs the same hold. Styles recalc before
    // the next paint, so setting the attribute here still lands in that recalc.
    const follow = () => {
      freezeTransitions();
      applyThemeColor("auto");
    };
    dark.addEventListener("change", follow);
    return () => dark.removeEventListener("change", follow);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    writeSetting(THEME_SETTING, next === DEFAULT_THEME ? "" : next);
  }, []);

  const setPlayerName = useCallback((next: string) => {
    setPlayerNameState(next);
    writeSetting(PLAYER_NAME_SETTING, next);
  }, []);

  const setLiveAnalysis = useCallback((next: boolean) => {
    setLiveAnalysisState(next);
    writeSetting(LIVE_ANALYSIS_SETTING, next ? "" : LIVE_ANALYSIS_OFF);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      playerName,
      setPlayerName,
      liveAnalysis,
      setLiveAnalysis,
    }),
    [theme, setTheme, playerName, setPlayerName, liveAnalysis, setLiveAnalysis],
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
