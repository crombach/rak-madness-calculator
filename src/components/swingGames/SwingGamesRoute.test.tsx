import { useNavigate } from "react-router";
import { screen, waitFor, within } from "@testing-library/react";

vi.mock("../../utils/getLeagueInfo");
vi.mock("../../utils/readFileToBuffer");
vi.mock("../../utils/scoring/getPlayerScores");
vi.mock("../../utils/buildSpreadsheetBuffer");

import {
  CURRENT_WEEK,
  SEASON,
  getPlayerScoresMock,
  mountApp,
  scores as decidedScores,
  setUpAppTest,
  spreadsheetResponse,
} from "../../appTestFixtures";
import {
  EXPERIMENTAL_FEATURES_KEY,
  PLAYER_NAME_KEY,
} from "../../context/SettingsContext";
import { League } from "../../types/League";
import { LeagueResult } from "../../types/LeagueResult";
import plural, { verbFor } from "../../utils/plural";
import {
  delayedGame,
  liveGame,
  upcomingGame,
} from "../../utils/scoring/leagueResultFixtures";
import { pick, player, week } from "../../utils/scoring/scoringTestFixtures";

const SWINGS_PATH = `/${SEASON}/${CURRENT_WEEK}/swings`;

/** Steps back through the router's history, as the browser's own button does. */
function BackButton() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)}>
      Back
    </button>
  );
}

/** The toggle's `aria-label`: the game, then its player count. */
function bandName(game: string, count: number) {
  return `${game}, ${plural(count, "player")}`;
}

/** The game button's `aria-label`: opens Game Status, plus the live/delayed word. */
function gameButtonName(game: string, status?: string) {
  return [`Game Status for ${game}`, status]
    .filter((part) => part != null)
    .join(", ");
}

/** A side's heading, as its lowercase text reads under the CSS caps. */
function needsHeading(count: number, pickText: string) {
  return `${count} ${verbFor(count, "need")} ${pickText}`;
}

/** Level on points, so each is out if their side of P1 misses. */
function swingScores(alicePick = "KC -3", bobPick = "DEN 3") {
  const scores = week([
    player({ name: "Alice", total: 5, pro: [pick(alicePick)] }),
    player({ name: "Bob", total: 5, pro: [pick(bobPick)] }),
  ]);
  scores.games = [{ label: "P1", league: League.PRO, name: "KC at DEN" }];
  return scores;
}

const KC_BACKERS = [
  "Ann",
  "Ben",
  "Cal",
  "Dee",
  "Eli",
  "Fay",
  "Gus",
  "Hal",
  "Ivo",
];

/** `count` on KC, all out if it misses. */
function crowdedScores(count = KC_BACKERS.length) {
  const scores = week([
    ...KC_BACKERS.slice(0, count).map((name) =>
      player({ name, total: 5, pro: [pick("KC -3")] }),
    ),
    player({ name: "Bob", total: 5, pro: [pick("DEN 3")] }),
  ]);
  scores.games = [{ label: "P1", league: League.PRO, name: "KC at DEN" }];
  return scores;
}

/** Lays every name grid out in `count` columns, which jsdom cannot. */
function stubColumns(count: number) {
  const real = window.getComputedStyle.bind(window);
  vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudo) => {
    const style = real(element, pseudo);
    if (!element.classList.contains("swing-games__players")) return style;
    return new Proxy(style, {
      get: (target, key) => {
        if (key === "gridTemplateColumns") {
          return Array(count).fill("100px").join(" ");
        }
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  });
}

function playerButtons(pickName: string) {
  const side = screen.getByRole("heading", { name: pickName }).parentElement;
  return within(side as HTMLElement)
    .getAllByRole("button")
    .filter((button) => !/^Show/.test(button.textContent ?? ""));
}

beforeEach(() => {
  setUpAppTest().mockResolvedValue(spreadsheetResponse());
  getPlayerScoresMock.mockResolvedValue(swingScores());
  localStorage.setItem(EXPERIMENTAL_FEATURES_KEY, "on");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the swing games route", () => {
  it("names the page and marks neither view as selected", async () => {
    mountApp(SWINGS_PATH);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: `${SEASON} Week ${CURRENT_WEEK} Swing Games`,
      }),
    ).toBeInTheDocument();
    await screen.findByText("KC at DEN");
    expect(
      screen.getByText(`Swing Games · ${SEASON} Season · Week ${CURRENT_WEEK}`),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Scoreboard" })).toBeEnabled();
  });

  it("sets the menu off from the view buttons with a divider", async () => {
    mountApp(SWINGS_PATH);
    await screen.findByText("KC at DEN");

    const divider = screen
      .getByRole("button", { name: "Menu" })
      .closest(".nav-menu__anchor")?.previousElementSibling;
    expect(divider).toHaveClass("navbar__divider");
    expect(divider?.previousElementSibling).toContainElement(
      screen.getByRole("button", { name: "Picks" }),
    );
  });

  it("shows each side of a game with the players it knocks out", async () => {
    mountApp(SWINGS_PATH);

    const game = (await screen.findByText("KC at DEN")).closest("section");
    expect(game).not.toBeNull();
    const inGame = within(game as HTMLElement);
    const kc = inGame.getByRole("heading", { name: needsHeading(1, "KC -3") });
    const den = inGame.getByRole("heading", {
      name: needsHeading(1, "DEN +3"),
    });
    expect(kc.parentElement).toContainElement(
      inGame.getByRole("button", { name: "Alice" }),
    );
    expect(den.parentElement).toContainElement(
      inGame.getByRole("button", { name: "Bob" }),
    );
    expect(inGame.queryByText(/Out if it misses/)).not.toBeInTheDocument();
  });

  it("names a pick with no spread by its team alone", async () => {
    getPlayerScoresMock.mockResolvedValue(swingScores("KC", "DEN"));
    mountApp(SWINGS_PATH);

    expect(
      await screen.findByRole("heading", { name: needsHeading(1, "KC") }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: needsHeading(1, "DEN") }),
    ).toBeInTheDocument();
  });

  it("opens the player analysis from a player's name", async () => {
    const user = mountApp(SWINGS_PATH);

    await user.click(await screen.findByRole("button", { name: "Alice" }));

    const dialog = await screen.findByRole("dialog", {
      name: /Player Analysis/,
    });
    expect(within(dialog).getByRole("combobox")).toHaveValue("Alice");
  });

  it("opens the player analysis from the keyboard", async () => {
    const user = mountApp(SWINGS_PATH);
    const bob = await screen.findByRole("button", { name: "Bob" });

    bob.focus();
    await user.keyboard("{Enter}");

    const dialog = await screen.findByRole("dialog", {
      name: /Player Analysis/,
    });
    expect(within(dialog).getByRole("combobox")).toHaveValue("Bob");
  });

  it("opens the game status from the game button, leaving it open", async () => {
    const user = mountApp(SWINGS_PATH);

    await user.click(
      await screen.findByRole("button", {
        name: gameButtonName("P1 KC at DEN"),
      }),
    );

    expect(
      await screen.findByRole("dialog", { name: /Game Status/ }),
    ).toBeInTheDocument();
    // Behind the modal dialog, which hides the page from the accessibility tree.
    expect(
      screen.getByRole("button", {
        name: bandName("P1 KC at DEN", 2),
        hidden: true,
      }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("reaches the game button before the toggle, tabbing through", async () => {
    const user = mountApp(SWINGS_PATH);
    const gameButton = await screen.findByRole("button", {
      name: gameButtonName("P1 KC at DEN"),
    });
    const toggle = screen.getByRole("button", {
      name: bandName("P1 KC at DEN", 2),
    });

    gameButton.focus();
    await user.tab();

    expect(toggle).toHaveFocus();
  });

  it("lists games in column order and names each band by its column", async () => {
    // P2 knocks out more players than P1, and still comes second.
    const scores = week([
      player({ name: "Alice", total: 5, pro: [pick("KC"), pick("SF")] }),
      player({ name: "Bob", total: 5, pro: [pick("KC"), pick("LAR")] }),
      player({ name: "Carol", total: 4, pro: [pick("DEN"), pick("SF")] }),
      player({ name: "Dan", total: 4, pro: [pick("DEN"), pick("SF")] }),
    ]);
    scores.games = [
      { label: "P1", league: League.PRO, name: "KC at DEN" },
      { label: "P2", league: League.PRO, name: "SF at LAR" },
    ];
    getPlayerScoresMock.mockResolvedValue(scores);
    mountApp(SWINGS_PATH);
    await screen.findByText("KC at DEN");

    const bands = screen
      .getAllByRole("button", { name: /^Game Status for/ })
      .map((band) => band.textContent);
    expect(bands).toEqual(["P1 KC at DEN", "P2 SF at LAR"]);
    expect(screen.getByText("P1")).toHaveClass("swing-games__game-label");
  });

  describe("folding a game", () => {
    /** Alice needs both games, so each is a swing. */
    function twoGameScores() {
      const scores = week([
        player({
          name: "Alice",
          total: 5,
          pro: [pick("KC -3"), pick("NYJ")],
        }),
        player({ name: "Bob", total: 6, pro: [pick("DEN 3"), pick("MIA")] }),
      ]);
      scores.games = [
        { label: "P1", league: League.PRO, name: "KC at DEN" },
        { label: "P2", league: League.PRO, name: "NYJ at MIA" },
      ];
      return scores;
    }

    it("starts every game open", async () => {
      getPlayerScoresMock.mockResolvedValue(twoGameScores());
      mountApp(SWINGS_PATH);

      for (const name of [
        bandName("P1 KC at DEN", 1),
        bandName("P2 NYJ at MIA", 1),
      ]) {
        expect(await screen.findByRole("button", { name })).toHaveAttribute(
          "aria-expanded",
          "true",
        );
      }
    });

    it("folds a game from its band and opens it again, on its own", async () => {
      getPlayerScoresMock.mockResolvedValue(twoGameScores());
      const user = mountApp(SWINGS_PATH);
      const band = await screen.findByRole("button", {
        name: bandName("P1 KC at DEN", 1),
      });

      await user.click(band);

      expect(band).toHaveAttribute("aria-expanded", "false");
      await waitFor(() =>
        expect(
          screen.queryByRole("heading", { name: needsHeading(1, "KC -3") }),
        ).not.toBeInTheDocument(),
      );
      expect(
        screen.getByRole("heading", { name: needsHeading(1, "NYJ") }),
      ).toBeInTheDocument();

      await user.click(band);

      expect(band).toHaveAttribute("aria-expanded", "true");
      expect(
        await screen.findByRole("heading", { name: needsHeading(1, "KC -3") }),
      ).toBeInTheDocument();
    });

    it("starts every game open again in another week", async () => {
      // A fresh spreadsheet per fetch, since each week reads its own body.
      vi.mocked(global.fetch).mockImplementation(() =>
        Promise.resolve(spreadsheetResponse()),
      );
      getPlayerScoresMock.mockResolvedValue(twoGameScores());
      const user = mountApp(SWINGS_PATH, {
        earlier: [`/${SEASON}/${CURRENT_WEEK - 1}/swings`],
        beside: <BackButton />,
      });
      const band = await screen.findByRole("button", {
        name: bandName("P1 KC at DEN", 1),
      });
      await user.click(band);
      expect(band).toHaveAttribute("aria-expanded", "false");

      await user.click(screen.getByRole("button", { name: "Back" }));

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: bandName("P1 KC at DEN", 1) }),
        ).toHaveAttribute("aria-expanded", "true"),
      );
    });

    it("folds and opens from the keyboard", async () => {
      const user = mountApp(SWINGS_PATH);
      const band = await screen.findByRole("button", {
        name: bandName("P1 KC at DEN", 2),
      });

      band.focus();
      await user.keyboard("{Enter}");
      expect(band).toHaveAttribute("aria-expanded", "false");

      await user.keyboard(" ");
      expect(band).toHaveAttribute("aria-expanded", "true");
    });

    it("keeps a side shown in full through a fold", async () => {
      getPlayerScoresMock.mockResolvedValue(crowdedScores());
      const user = mountApp(SWINGS_PATH);
      const band = await screen.findByRole("button", {
        name: bandName("P1 KC at DEN", 10),
      });

      await user.click(screen.getByRole("button", { name: "Show More" }));
      await user.click(band);
      await user.click(band);

      expect(
        await screen.findByRole("button", { name: "Show Fewer" }),
      ).toBeInTheDocument();
    });
  });

  it("folds a long side to two rows, then shows the rest on asking", async () => {
    stubColumns(2);
    getPlayerScoresMock.mockResolvedValue(crowdedScores());
    const user = mountApp(SWINGS_PATH);
    await screen.findByText("KC at DEN");

    expect(
      playerButtons(needsHeading(9, "KC -3")).map((it) => it.textContent),
    ).toEqual(KC_BACKERS.slice(0, 4));
    const more = screen.getByRole("button", { name: "Show More" });
    expect(more).toHaveAttribute("aria-expanded", "false");

    await user.click(more);

    expect(
      playerButtons(needsHeading(9, "KC -3")).map((it) => it.textContent),
    ).toEqual(KC_BACKERS);
    expect(screen.getByRole("button", { name: "Show Fewer" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("offers no toggle for a side that fits in two rows", async () => {
    stubColumns(2);
    getPlayerScoresMock.mockResolvedValue(crowdedScores(4));
    mountApp(SWINGS_PATH);
    await screen.findByText("KC at DEN");

    expect(playerButtons(needsHeading(4, "KC -3"))).toHaveLength(4);
    expect(screen.queryByRole("button", { name: /^Show/ })).toBeNull();
  });

  it("fits more names on a screen with more columns", async () => {
    stubColumns(5);
    getPlayerScoresMock.mockResolvedValue(crowdedScores());
    mountApp(SWINGS_PATH);
    await screen.findByText("KC at DEN");

    expect(playerButtons(needsHeading(9, "KC -3"))).toHaveLength(9);
    expect(screen.queryByRole("button", { name: /^Show/ })).toBeNull();
  });

  it("puts the reader first and marks them, even in a folded side", async () => {
    localStorage.setItem(PLAYER_NAME_KEY, "  hal ");
    getPlayerScoresMock.mockResolvedValue(crowdedScores());
    mountApp(SWINGS_PATH);
    await screen.findByText("KC at DEN");

    const shown = playerButtons(needsHeading(9, "KC -3"));
    expect(shown.map((it) => it.textContent)).toEqual([
      "Hal",
      ...KC_BACKERS.slice(0, 3),
    ]);
    expect(shown[0]).toHaveClass("--mine");
    expect(shown[1]).not.toHaveClass("--mine");
  });

  describe("the mark on a game's heading", () => {
    function withResult(result: LeagueResult) {
      const scores = swingScores();
      scores.games = [{ ...scores.games![0], result }];
      return scores;
    }
    const teams = { home: "DEN", away: "KC" };

    it("dots a game being played, and says so", async () => {
      getPlayerScoresMock.mockResolvedValue(
        withResult(liveGame({ ...teams, homeScore: 7, awayScore: 3 })),
      );
      mountApp(SWINGS_PATH);

      const heading = await screen.findByRole("button", {
        name: gameButtonName("P1 KC at DEN", "Live"),
      });
      expect(heading.querySelector(".table__live-dot")).toBeInTheDocument();
    });

    it("pauses a game ESPN has stopped, and says so", async () => {
      getPlayerScoresMock.mockResolvedValue(
        withResult(
          delayedGame({ ...teams, homeScore: 7, awayScore: 3, period: 2 }),
        ),
      );
      mountApp(SWINGS_PATH);

      const heading = await screen.findByRole("button", {
        name: gameButtonName("P1 KC at DEN", "Delayed"),
      });
      expect(heading.querySelector(".table__delay-icon")).toBeInTheDocument();
      expect(heading.querySelector(".table__live-dot")).toBeNull();
    });

    it("marks nothing on a game yet to start", async () => {
      getPlayerScoresMock.mockResolvedValue(withResult(upcomingGame(teams)));
      mountApp(SWINGS_PATH);

      const heading = await screen.findByRole("button", {
        name: gameButtonName("P1 KC at DEN"),
      });
      expect(heading.querySelector(".table__live-dot")).toBeNull();
      expect(heading.querySelector(".table__delay-icon")).toBeNull();
    });
  });

  describe("a week with nothing to show", () => {
    /** Level on points, with both on KC, so P1 knocks nobody out. */
    function quietScores() {
      const scores = week([
        player({ name: "Alice", total: 5, pro: [pick("KC -3")] }),
        player({ name: "Bob", total: 5, pro: [pick("KC -3")] }),
      ]);
      scores.games = [{ label: "P1", league: League.PRO, name: "KC at DEN" }];
      return scores;
    }

    it.each([
      ["a won week", () => decidedScores],
      ["open games no one must win", quietScores],
    ])("sends %s to the scoreboard in place of the page", async (_, make) => {
      getPlayerScoresMock.mockResolvedValue(make());
      const user = mountApp(SWINGS_PATH, {
        earlier: ["/"],
        beside: <BackButton />,
      });

      expect(
        await screen.findByRole("heading", {
          level: 1,
          name: `${SEASON} Week ${CURRENT_WEEK} Scoreboard`,
        }),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Back" }));

      expect(
        await screen.findByText("Use Local Spreadsheet"),
      ).toBeInTheDocument();
    });

    it("sends a reader without experimental features to the scoreboard in place of the page", async () => {
      localStorage.removeItem(EXPERIMENTAL_FEATURES_KEY);
      const user = mountApp(SWINGS_PATH, {
        earlier: ["/"],
        beside: <BackButton />,
      });

      expect(
        await screen.findByRole("heading", {
          level: 1,
          name: `${SEASON} Week ${CURRENT_WEEK} Scoreboard`,
        }),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Back" }));

      expect(
        await screen.findByText("Use Local Spreadsheet"),
      ).toBeInTheDocument();
    });
  });
});
