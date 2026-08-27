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

/** The `<meta>` `applyThemeColor` writes, which no test fixture puts in the DOM. */
function mountThemeColorMeta(): HTMLMetaElement {
  const meta = document.createElement("meta");
  meta.name = "theme-color";
  document.head.append(meta);
  return meta;
}

/** Answers the dark query, which `setupTests` otherwise answers no to. */
function stubPrefersDark(prefersDark: boolean) {
  const original = window.matchMedia;
  window.matchMedia = (media: string) =>
    ({
      ...original(media),
      matches: media.includes("prefers-color-scheme: dark") && prefersDark,
    }) as MediaQueryList;
  return () => {
    window.matchMedia = original;
  };
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
  delete document.documentElement.dataset.themeSwitching;
});

describe("SettingsContext, the theme", () => {
  it("follows the OS until told otherwise", () => {
    mountProbe();

    expect(screen.getByTestId("theme")).toHaveTextContent("auto");
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("names the chosen theme on the document, for index.scss to select on", async () => {
    const user = mountProbe();
    await user.click(screen.getByRole("button", { name: "dark" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  });

  it("takes the name back off the document on the way to auto", async () => {
    const user = mountProbe();
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
    const user = mountProbe();
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

describe("SettingsContext, the browser's own chrome bar", () => {
  // The default is `auto`, so this is what a reader who never opens the settings
  // gets. Left on the dark value it stood a dark bar over the light navbar.
  it("follows the operating system while the theme is auto", () => {
    const meta = mountThemeColorMeta();
    const restore = stubPrefersDark(false);
    try {
      mountProbe();
      expect(meta.content).toBe("#eaeaea");
    } finally {
      restore();
      meta.remove();
    }
  });

  it("takes the dark value on a dark operating system", () => {
    const meta = mountThemeColorMeta();
    const restore = stubPrefersDark(true);
    try {
      mountProbe();
      expect(meta.content).toBe("#4f4f4f");
    } finally {
      restore();
      meta.remove();
    }
  });

  it("takes the chosen theme over the operating system", async () => {
    const meta = mountThemeColorMeta();
    const restore = stubPrefersDark(true);
    try {
      const user = mountProbe();
      await user.click(screen.getByRole("button", { name: "light" }));
      expect(meta.content).toBe("#eaeaea");
    } finally {
      restore();
      meta.remove();
    }
  });
});

/**
 * Holds the frame callbacks instead of running them, so the attribute the theme
 * change sets can be read while it is still up.
 */
function holdFrames() {
  const original = window.requestAnimationFrame;
  const queued: Array<FrameRequestCallback> = [];
  window.requestAnimationFrame = ((next: FrameRequestCallback) =>
    queued.push(next)) as typeof window.requestAnimationFrame;
  return {
    /** Runs every frame queued so far, and every frame those queue in turn. */
    flush() {
      while (queued.length) {
        queued.shift()?.(0);
      }
    },
    restore() {
      window.requestAnimationFrame = original;
    },
  };
}

/** Catches the listener the auto theme installs, so an OS flip can be played. */
function captureDarkListener() {
  const original = window.matchMedia;
  let flip: (() => void) | undefined;
  window.matchMedia = (media: string) =>
    ({
      ...original(media),
      addEventListener: (_name: string, next: () => void) => {
        flip = next;
      },
    }) as MediaQueryList;
  return {
    flip: () => flip?.(),
    restore: () => {
      window.matchMedia = original;
    },
  };
}

describe("SettingsContext, the transitions a theme change would ease", () => {
  it("holds them still across the frame the new colors land in", async () => {
    const frames = holdFrames();
    try {
      const user = mountProbe();
      await user.click(screen.getByRole("button", { name: "dark" }));

      expect(document.documentElement.dataset.themeSwitching).toBe("");

      frames.flush();
      expect(document.documentElement.dataset.themeSwitching).toBeUndefined();
    } finally {
      frames.restore();
    }
  });

  it("holds them still when the operating system flips under auto", () => {
    const dark = captureDarkListener();
    const frames = holdFrames();
    try {
      mountProbe();
      frames.flush();
      expect(document.documentElement.dataset.themeSwitching).toBeUndefined();

      dark.flip();
      expect(document.documentElement.dataset.themeSwitching).toBe("");
    } finally {
      frames.restore();
      dark.restore();
    }
  });
});
