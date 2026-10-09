import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import {
  EXPERIMENTAL_FEATURES_KEY,
  LIVE_ANALYSIS_KEY,
  PLAYER_NAME_KEY,
  SettingsContextProvider,
  THEME_KEY,
  Theme,
  useIsMyPlayer,
  useSetting,
  useSettings,
} from "./SettingsContext";

function Probe({ candidate = "Linebacher" }: { candidate?: string }) {
  const {
    theme,
    setTheme,
    playerName,
    setPlayerName,
    liveAnalysis,
    setLiveAnalysis,
    experimentalFeatures,
    setExperimentalFeatures,
  } = useSettings();
  const isMine = useIsMyPlayer(candidate);
  return (
    <>
      <span data-testid="theme">{theme}</span>
      <span data-testid="playerName">{playerName}</span>
      <span data-testid="isMine">{String(isMine)}</span>
      <span data-testid="liveAnalysis">{String(liveAnalysis)}</span>
      <button onClick={() => setLiveAnalysis(false)}>hide analysis</button>
      <button onClick={() => setLiveAnalysis(true)}>show analysis</button>
      <span data-testid="experimentalFeatures">
        {String(experimentalFeatures)}
      </span>
      <button onClick={() => setExperimentalFeatures(true)}>opt in</button>
      <button onClick={() => setExperimentalFeatures(false)}>opt out</button>
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

/**
 * Holds the frame callbacks instead of running them, so the attribute the theme
 * change sets can be read while it is still up.
 */
function holdFrames() {
  const originalRequest = window.requestAnimationFrame;
  const originalCancel = window.cancelAnimationFrame;
  const queued = new Map<number, FrameRequestCallback>();
  let handle = 0;
  window.requestAnimationFrame = ((next: FrameRequestCallback) => {
    handle += 1;
    queued.set(handle, next);
    return handle;
  }) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = ((id: number) => {
    queued.delete(id);
  }) as typeof window.cancelAnimationFrame;
  return {
    /** Runs every frame queued so far, and every frame those queue in turn. */
    flush() {
      while (queued.size) {
        const [id, next] = [...queued][0];
        queued.delete(id);
        next(0);
      }
    },
    /** How many frames are waiting, which a canceled one is not. */
    pending: () => queued.size,
    restore() {
      window.requestAnimationFrame = originalRequest;
      window.cancelAnimationFrame = originalCancel;
    },
  };
}

/**
 * The queue every test in this file runs its frames on.
 *
 * Every test mounts the provider, and every mount queues the frames that clear
 * the theme freeze. Left on the real clock those fire during a later test's
 * `await`, and clear an attribute that test had just set. Nothing restores a
 * frame already queued on the real clock, so no test may queue one.
 */
let frames: ReturnType<typeof holdFrames>;

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.themeSwitching;
  frames = holdFrames();
});

afterEach(() => {
  frames.restore();
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

describe("SettingsContext, the live player analysis", () => {
  it("is on for a reader who has never said otherwise", () => {
    mountProbe();

    expect(screen.getByTestId("liveAnalysis")).toHaveTextContent("true");
  });

  it("saves the one value it has to store, and reads it back", async () => {
    const user = mountProbe();
    await user.click(screen.getByRole("button", { name: "hide analysis" }));

    expect(screen.getByTestId("liveAnalysis")).toHaveTextContent("false");
    expect(localStorage.getItem(LIVE_ANALYSIS_KEY)).toBe("off");
  });

  it("stores nothing for the default, the way the theme does", async () => {
    const user = mountProbe();
    await user.click(screen.getByRole("button", { name: "hide analysis" }));
    await user.click(screen.getByRole("button", { name: "show analysis" }));

    expect(screen.getByTestId("liveAnalysis")).toHaveTextContent("true");
    expect(localStorage.getItem(LIVE_ANALYSIS_KEY)).toBeNull();
  });

  it("starts off where it was left off", () => {
    localStorage.setItem(LIVE_ANALYSIS_KEY, "off");
    mountProbe();

    expect(screen.getByTestId("liveAnalysis")).toHaveTextContent("false");
  });

  it("reads anything else stored as on, rather than as off", () => {
    localStorage.setItem(LIVE_ANALYSIS_KEY, "true");
    mountProbe();

    expect(screen.getByTestId("liveAnalysis")).toHaveTextContent("true");
  });
});

describe("SettingsContext, the experimental features", () => {
  it("is off for a reader who has never opted in", () => {
    mountProbe();

    expect(screen.getByTestId("experimentalFeatures")).toHaveTextContent(
      "false",
    );
  });

  it("saves the opt-in, and forgets it on the way back out", async () => {
    const user = mountProbe();
    await user.click(screen.getByRole("button", { name: "opt in" }));

    expect(screen.getByTestId("experimentalFeatures")).toHaveTextContent(
      "true",
    );
    expect(localStorage.getItem(EXPERIMENTAL_FEATURES_KEY)).toBe("on");

    await user.click(screen.getByRole("button", { name: "opt out" }));

    expect(screen.getByTestId("experimentalFeatures")).toHaveTextContent(
      "false",
    );
    expect(localStorage.getItem(EXPERIMENTAL_FEATURES_KEY)).toBeNull();
  });

  it("starts on where it was left on", () => {
    localStorage.setItem(EXPERIMENTAL_FEATURES_KEY, "on");
    mountProbe();

    expect(screen.getByTestId("experimentalFeatures")).toHaveTextContent(
      "true",
    );
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
    const user = mountProbe();
    await user.click(screen.getByRole("button", { name: "dark" }));

    expect(document.documentElement.dataset.themeSwitching).toBe("");

    frames.flush();
    expect(document.documentElement.dataset.themeSwitching).toBeUndefined();
  });

  // Without the cancel, the first change's clear stays queued and fires two
  // frames in, which lifts the hold the second change is still standing on.
  it("keeps only one clear waiting when changes come back to back", async () => {
    const user = mountProbe();
    expect(frames.pending()).toBe(1);

    await user.click(screen.getByRole("button", { name: "dark" }));
    expect(frames.pending()).toBe(1);

    await user.click(screen.getByRole("button", { name: "light" }));
    expect(frames.pending()).toBe(1);
    expect(document.documentElement.dataset.themeSwitching).toBe("");
  });

  it("holds them still when the operating system flips under auto", () => {
    const dark = captureDarkListener();
    try {
      mountProbe();
      frames.flush();
      expect(document.documentElement.dataset.themeSwitching).toBeUndefined();

      dark.flip();
      expect(document.documentElement.dataset.themeSwitching).toBe("");

      frames.flush();
      expect(document.documentElement.dataset.themeSwitching).toBeUndefined();
    } finally {
      dark.restore();
    }
  });
});

describe("SettingsContext, which readers a change reaches", () => {
  const renders = new Map<string, number>();
  const count = (label: string) =>
    renders.set(label, (renders.get(label) ?? 0) + 1);

  function NameRow({ name }: { name: string }) {
    const isMine = useIsMyPlayer(name);
    count(name);
    return <span>{`${name} ${isMine}`}</span>;
  }

  function LiveAnalysisRow() {
    const liveAnalysis = useSetting("liveAnalysis");
    count("liveAnalysis");
    return <span>{String(liveAnalysis)}</span>;
  }

  function mountRows() {
    renders.clear();
    const user = userEvent.setup();
    render(
      <SettingsContextProvider>
        <Probe />
        <NameRow name="Linebacher" />
        <NameRow name="Barb Wire" />
        <LiveAnalysisRow />
      </SettingsContextProvider>,
    );
    return user;
  }

  it("leaves every row alone on a theme change", async () => {
    const user = mountRows();
    const before = new Map(renders);
    await user.click(screen.getByRole("button", { name: "dark" }));

    expect(renders).toEqual(before);
  });

  it("renders only the row a new name makes the reader's own", async () => {
    const user = mountRows();
    const before = new Map(renders);
    await user.click(screen.getByRole("button", { name: "name me" }));

    expect(renders.get("Linebacher")).toBe(before.get("Linebacher")! + 1);
    expect(renders.get("Barb Wire")).toBe(before.get("Barb Wire"));
    expect(renders.get("liveAnalysis")).toBe(before.get("liveAnalysis"));
  });
});
