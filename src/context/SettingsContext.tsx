import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import doNothing from "../utils/doNothing";
import { PREFIX, readSetting, writeSetting } from "../utils/settingsStore";

export type Theme = "light" | "dark" | "auto";

const THEME_SETTING = "theme";
const PLAYER_NAME_SETTING = "playerName";
const LIVE_ANALYSIS_SETTING = "liveAnalysis";
const EXPERIMENTAL_FEATURES_SETTING = "experimentalFeatures";

/** The exact key `settingsStore` writes to, for a test that reads localStorage directly. */
export const THEME_KEY = PREFIX + THEME_SETTING;
export const PLAYER_NAME_KEY = PREFIX + PLAYER_NAME_SETTING;
export const LIVE_ANALYSIS_KEY = PREFIX + LIVE_ANALYSIS_SETTING;
export const EXPERIMENTAL_FEATURES_KEY = PREFIX + EXPERIMENTAL_FEATURES_SETTING;

/** The only value this setting is ever stored as, the default being stored as nothing. */
const LIVE_ANALYSIS_OFF = "off";
const EXPERIMENTAL_FEATURES_ON = "on";

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

type SettingValues = {
  theme: Theme;
  /**
   * What the reader is called in the picks sheet, or the empty string for a reader
   * who has not said. Kept as typed, since it is theirs to read back.
   */
  playerName: string;
  /**
   * Whether a week still being played says where each player stands. Off, the
   * tables mark nobody and open nothing until the week is decided, for a reader
   * who would rather watch the games than be told how they end.
   */
  liveAnalysis: boolean;
  /** Whether the reader opted into work-in-progress features. */
  experimentalFeatures: boolean;
};

type SettingKey = keyof SettingValues;

type SetterName<K extends SettingKey> = `set${Capitalize<K>}`;

type SettingSetters = {
  [K in SettingKey as SetterName<K>]: (value: SettingValues[K]) => void;
};

type Settings = SettingValues & SettingSetters;

/** How a setting is read off its stored string and written back as one. */
type Codec<T> = {
  read: (stored: string | undefined) => T;
  write: (value: T) => string;
};

const THEME_CODEC: Codec<Theme> = {
  read: (saved) =>
    saved === "light" || saved === "dark" ? saved : DEFAULT_THEME,
  write: (theme) => (theme === DEFAULT_THEME ? "" : theme),
};

const PLAYER_NAME_CODEC: Codec<string> = {
  read: (saved) => saved ?? "",
  write: (name) => name,
};

/**
 * On unless it was turned off, which is what the app did before it could be told.
 * Anything else stored reads as on, the same way an unparseable theme does.
 */
const LIVE_ANALYSIS_CODEC: Codec<boolean> = {
  read: (saved) => saved !== LIVE_ANALYSIS_OFF,
  write: (enabled) => (enabled ? "" : LIVE_ANALYSIS_OFF),
};

const EXPERIMENTAL_FEATURES_CODEC: Codec<boolean> = {
  read: (saved) => saved === EXPERIMENTAL_FEATURES_ON,
  write: (enabled) => (enabled ? EXPERIMENTAL_FEATURES_ON : ""),
};

const STORED: {
  [K in SettingKey]: { name: string; codec: Codec<SettingValues[K]> };
} = {
  theme: { name: THEME_SETTING, codec: THEME_CODEC },
  playerName: { name: PLAYER_NAME_SETTING, codec: PLAYER_NAME_CODEC },
  liveAnalysis: { name: LIVE_ANALYSIS_SETTING, codec: LIVE_ANALYSIS_CODEC },
  experimentalFeatures: {
    name: EXPERIMENTAL_FEATURES_SETTING,
    codec: EXPERIMENTAL_FEATURES_CODEC,
  },
};

const SETTING_KEYS = Object.keys(STORED) as Array<SettingKey>;

function setterName<K extends SettingKey>(key: K): SetterName<K> {
  return `set${key[0].toUpperCase()}${key.slice(1)}` as SetterName<K>;
}

function readValues(
  lookup: (name: string) => string | undefined,
): SettingValues {
  const read = <K extends SettingKey>(key: K) =>
    STORED[key].codec.read(lookup(STORED[key].name));
  return Object.fromEntries(
    SETTING_KEYS.map((key) => [key, read(key)]),
  ) as SettingValues;
}

/** A setter for every setting, each one `setter` makes for its key. */
function eachSetter(
  setter: <K extends SettingKey>(key: K) => (value: SettingValues[K]) => void,
): SettingSetters {
  return Object.fromEntries(
    SETTING_KEYS.map((key) => [setterName(key), setter(key)]),
  ) as SettingSetters;
}

/**
 * The settings, held outside React so a reader subscribes to the one value it
 * reads. A context value would render every reader on every change.
 */
type SettingsStore = {
  get: () => SettingValues;
  subscribe: (listener: () => void) => () => void;
  setters: SettingSetters;
};

/** Read once from storage, and written through on every change. */
function createSettingsStore(): SettingsStore {
  let values = readValues(readSetting);
  const listeners = new Set<() => void>();
  const setter =
    <K extends SettingKey>(key: K) =>
    (next: SettingValues[K]) => {
      if (Object.is(values[key], next)) return;
      writeSetting(STORED[key].name, STORED[key].codec.write(next));
      values = { ...values, [key]: next };
      listeners.forEach((listener) => listener());
    };
  return {
    get: () => values,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setters: eachSetter(setter),
  };
}

const DEFAULT_VALUES = readValues(() => undefined);

// Defaults rather than a throw, following `PlayerAnalysisContext`. The tables read
// this per row and both suites mount them on their own, with no provider above.
const SettingsContext = createContext<SettingsStore>({
  get: () => DEFAULT_VALUES,
  subscribe: () => doNothing,
  setters: eachSetter(() => doNothing),
});

export const DARK_QUERY = "(prefers-color-scheme: dark)";

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
 * default is `auto`, so leaving this on the dark value stands a dark chrome bar
 * over a light navbar for every reader who never opens the settings at all.
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
  const [store] = useState(createSettingsStore);
  const theme = useSyncExternalStore(store.subscribe, () => store.get().theme);

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

  return (
    <SettingsContext.Provider value={store}>
      {children}
    </SettingsContext.Provider>
  );
}

/** Every setting, rendering on a change to any of them. */
export function useSettings(): Settings {
  const store = useContext(SettingsContext);
  const values = useSyncExternalStore(store.subscribe, store.get);
  return useMemo(() => ({ ...values, ...store.setters }), [values, store]);
}

/**
 * What `select` reads off the settings, rendering only when its answer changes.
 * Held to a primitive, because `useSyncExternalStore` compares answers with
 * `Object.is` and a fresh object would render forever.
 */
function useSelected<T extends string | boolean>(
  select: (values: SettingValues) => T,
): T {
  const store = useContext(SettingsContext);
  return useSyncExternalStore(store.subscribe, () => select(store.get()));
}

/** One setting, rendering only when it changes. */
export function useSetting<K extends SettingKey>(key: K): SettingValues[K] {
  return useSelected((values) => values[key]);
}

/**
 * Whether a player in a table is the reader themselves.
 *
 * Trimmed and case-folded, which nothing else comparing these names is. They come
 * out of the picks sheet as whoever typed them left them, and every other consumer
 * matches one sheet value against another with `===`. This one matches a sheet
 * value against something a reader typed from memory.
 */
export function useIsMyPlayer(name: string): boolean {
  return useSelected(({ playerName }) => isMyPlayer(name, playerName));
}

/** `useIsMyPlayer` against a name already read, for a caller matching many. */
export function isMyPlayer(name: string, playerName: string): boolean {
  const mine = playerName.trim().toLowerCase();
  return mine !== "" && name.trim().toLowerCase() === mine;
}
