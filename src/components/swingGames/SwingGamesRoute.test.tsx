import { useNavigate } from "react-router";
import { screen, within } from "@testing-library/react";

vi.mock("../../utils/getLeagueInfo");
vi.mock("../../utils/readFileToBuffer");
vi.mock("../../utils/scoring/getPlayerScores");
vi.mock("../../utils/buildSpreadsheetBuffer");
// The page itself, spied on, so the gate's own test can tell the page never
// mounted rather than read a redirect the page would make on its own.
vi.mock("./SwingGames", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./SwingGames")>();
  return { default: vi.fn(actual.default) };
});

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
import plural from "../../utils/plural";
import SwingGames from "./SwingGames";
import {
  delayedGame,
  finalGame,
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

/**
 * The band's `aria-label`: opens Game Status, the player count, then its mark's
 * label. A game with no ESPN result, as most fixtures here are, reads as unlisted.
 */
function gameButtonName(
  game: string,
  count: number,
  status = "Not listed by ESPN",
) {
  return `Game Status for ${game}, ${plural(count, "player")}, ${status}`;
}

/** The mark in a game's band, found from its game button. */
function bandMark(gameButton: HTMLElement) {
  return gameButton
    .closest(".swing-games__title")
    ?.querySelector(".game-status__mark:not(.--count)");
}

/** A side's heading, as its lowercase text reads under the CSS caps. */
function mustWinHeading(count: number, pickText: string) {
  return `${count} must win ${pickText}`;
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
  localStorage.setItem(EXPERIMENTAL_FEATURES_KEY, "on");
  getPlayerScoresMock.mockResolvedValue(swingScores());
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
      screen.getByText(`Swing Games • ${SEASON} Season • Week ${CURRENT_WEEK}`),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Scoreboard" })).toBeEnabled();
  });

  it("offers no refresh, since the page polls on its own", async () => {
    mountApp(SWINGS_PATH);
    await screen.findByText("KC at DEN");

    expect(
      screen.queryByRole("button", { name: "Refresh" }),
    ).not.toBeInTheDocument();
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

    const game = (await screen.findByText("KC at DEN")).closest(
      ".swing-games__group",
    );
    expect(game).not.toBeNull();
    const inGame = within(game as HTMLElement);
    const kc = inGame.getByRole("heading", {
      name: mustWinHeading(1, "KC -3"),
    });
    const den = inGame.getByRole("heading", {
      name: mustWinHeading(1, "DEN +3"),
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
      await screen.findByRole("heading", { name: mustWinHeading(1, "KC") }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: mustWinHeading(1, "DEN") }),
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

  it("opens the game status from the band", async () => {
    const user = mountApp(SWINGS_PATH);

    await user.click(
      await screen.findByRole("button", {
        name: gameButtonName("P1 KC at DEN", 2),
      }),
    );

    expect(
      await screen.findByRole("dialog", { name: /Game Status/ }),
    ).toBeInTheDocument();
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
      .map((band) =>
        [".swing-games__game-label", ".swing-games__game-matchup"]
          .map((part) => band.querySelector(part)?.textContent)
          .join(" "),
      );
    expect(bands).toEqual(["P1 KC at DEN", "P2 SF at LAR"]);
    expect(screen.getByText("P1")).toHaveClass("swing-games__game-label");
  });

  describe("a week under way", () => {
    // P1 put Alice a point clear of Carol and left Bob, level with Alice on every
    // game after it, no way past her. Carol needs both games still to come.
    function underWayScores() {
      const scores = week([
        player({
          name: "Alice",
          total: 6,
          pro: [pick("KC", "yes"), pick("SF"), pick("MIA")],
        }),
        player({
          name: "Carol",
          total: 5,
          pro: [pick("KC", "yes"), pick("LAR"), pick("NYJ")],
        }),
        player({
          name: "Bob",
          total: 4,
          pro: [pick("DEN", "no"), pick("SF"), pick("MIA")],
          isKnockedOut: true,
        }),
      ]);
      scores.games = [
        {
          label: "P1",
          league: League.PRO,
          name: "KC at DEN",
          result: finalGame({
            home: "DEN",
            away: "KC",
            homeScore: 10,
            awayScore: 20,
          }),
        },
        {
          label: "P2",
          league: League.PRO,
          name: "SF at LAR",
          result: liveGame({
            home: "LAR",
            away: "SF",
            homeScore: 7,
            awayScore: 3,
          }),
        },
        {
          label: "P3",
          league: League.PRO,
          name: "MIA at NYJ",
          result: upcomingGame({ home: "NYJ", away: "MIA" }),
        },
      ];
      return scores;
    }

    it("sorts the games into the sections All Games has, live first", async () => {
      getPlayerScoresMock.mockResolvedValue(underWayScores());
      mountApp(SWINGS_PATH);
      await screen.findByText("KC at DEN");

      const sections = screen
        .getAllByRole("region")
        .filter((region) => region.classList.contains("swing-games__section"));
      expect(
        sections.map((section) => [
          within(section).getByRole("heading", { level: 2 }).firstChild
            ?.textContent,
          within(section)
            .getAllByRole("heading", { level: 3 })
            .map(
              (band) =>
                band.querySelector(".swing-games__game-label")?.textContent,
            ),
        ]),
      ).toEqual([
        ["Live", ["P2"]],
        ["Today", ["P3"]],
        ["Completed", ["P1"]],
      ]);
    });

    it("keeps a final game with the players it knocked out, ruled as out", async () => {
      getPlayerScoresMock.mockResolvedValue(underWayScores());
      mountApp(SWINGS_PATH);

      const heading = await screen.findByRole("heading", {
        level: 4,
        name: "1 knocked out on DEN",
      });
      const bob = within(heading.parentElement as HTMLElement).getByRole(
        "button",
        { name: "Bob" },
      );
      expect(bob).toHaveClass("--knocked-out");
      for (const carol of screen.getAllByRole("button", { name: "Carol" })) {
        expect(carol).not.toHaveClass("--knocked-out");
      }
    });
  });

  it("folds a long side to two rows, then shows the rest on asking", async () => {
    stubColumns(2);
    getPlayerScoresMock.mockResolvedValue(crowdedScores());
    const user = mountApp(SWINGS_PATH);
    await screen.findByText("KC at DEN");

    expect(
      playerButtons(mustWinHeading(9, "KC -3")).map((it) => it.textContent),
    ).toEqual(KC_BACKERS.slice(0, 4));
    const more = screen.getByRole("button", { name: "Show More" });
    expect(more).toHaveAttribute("aria-expanded", "false");

    await user.click(more);

    expect(
      playerButtons(mustWinHeading(9, "KC -3")).map((it) => it.textContent),
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

    expect(playerButtons(mustWinHeading(4, "KC -3"))).toHaveLength(4);
    expect(screen.queryByRole("button", { name: /^Show/ })).toBeNull();
  });

  it("fits more names on a screen with more columns", async () => {
    stubColumns(5);
    getPlayerScoresMock.mockResolvedValue(crowdedScores());
    mountApp(SWINGS_PATH);
    await screen.findByText("KC at DEN");

    expect(playerButtons(mustWinHeading(9, "KC -3"))).toHaveLength(9);
    expect(screen.queryByRole("button", { name: /^Show/ })).toBeNull();
  });

  it("puts the reader first and marks them, even in a folded side", async () => {
    localStorage.setItem(PLAYER_NAME_KEY, "  hal ");
    getPlayerScoresMock.mockResolvedValue(crowdedScores());
    mountApp(SWINGS_PATH);
    await screen.findByText("KC at DEN");

    const shown = playerButtons(mustWinHeading(9, "KC -3"));
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
        name: gameButtonName("P1 KC at DEN", 2, "Live"),
      });
      expect(bandMark(heading)).toHaveClass("--live");
    });

    it("pauses a game ESPN has stopped, and says so", async () => {
      getPlayerScoresMock.mockResolvedValue(
        withResult(
          delayedGame({ ...teams, homeScore: 7, awayScore: 3, period: 2 }),
        ),
      );
      mountApp(SWINGS_PATH);

      const heading = await screen.findByRole("button", {
        name: gameButtonName("P1 KC at DEN", 2, "Delayed"),
      });
      expect(bandMark(heading)).toHaveClass("--delayed");
    });

    it("marks a game yet to start as upcoming", async () => {
      getPlayerScoresMock.mockResolvedValue(withResult(upcomingGame(teams)));
      mountApp(SWINGS_PATH);

      const heading = await screen.findByRole("button", {
        name: gameButtonName("P1 KC at DEN", 2, "Yet to kick off"),
      });
      expect(bandMark(heading)).toHaveClass("--upcoming");
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
      vi.mocked(SwingGames).mockClear();
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
      expect(SwingGames).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: "Back" }));

      expect(
        await screen.findByText("Use Local Spreadsheet"),
      ).toBeInTheDocument();
    });
  });
});
