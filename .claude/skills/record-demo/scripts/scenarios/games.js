import {
  buildPicksWorkbook,
  makeGame,
  registerAppMocks,
} from "../lib/mocks.js";
import {
  SEASON,
  WEEK,
  THEME_KEY,
  EXPERIMENTAL_FEATURES_KEY,
  PLAYER_NAME_KEY,
} from "../lib/constants.js";

/** `light` or `dark`. */
const THEME = process.env.LIVE_THEME ?? "light";

/** `1` ends P1 and P3 too, so the page says nothing is live. */
const NONE_LIVE = process.env.LIVE_NONE === "1";

/** `1` ends on Game Status for P1, opened from the reader's own cell. */
const OPEN_DIALOG = process.env.LIVE_DIALOG === "1";

/**
 * `1` pins the clock to the morning of the games, and spreads P2, P4 and P5 over
 * today, tomorrow and three days on, so each section and countdown shows.
 */
const SPREAD_DAYS = process.env.LIVE_DAYS === "1";
const DAYS_NOW = "2024-10-06T14:45Z";
const KICKOFFS = {
  P2EVT: "2024-10-06T17:00Z",
  P4EVT: "2024-10-07T17:00Z",
  P5EVT: "2024-10-09T20:15Z",
};

/** The reader, whose pick each scoreboard says. */
const MY_NAME = "Dee";

/** P1 live, P3 delayed, P2 and P4 not started, so the page lists two games. */
function rows() {
  const mine = {
    Name: MY_NAME,
    P1: "KC -3",
    P2: "SF -6",
    P3: "BUF",
    P4: "MIA +2",
  };
  const bob = {
    Name: "Bob",
    P1: "DEN +3",
    P2: "LAR +6",
    P3: "NYJ",
    P4: "NE -2",
  };
  if (!SPREAD_DAYS) return [mine, bob];
  return [
    { ...mine, P5: "GB" },
    { ...bob, P5: "CHI" },
  ];
}

/** Moves a game's kickoff, where ESPN keeps it twice. */
function at(game, date) {
  game.date = date;
  game.competitions[0].date = date;
  return game;
}

function events() {
  if (SPREAD_DAYS) {
    return {
      events: [
        makeGame("P1EVT", "DEN", "KC", 7, 6, "2"),
        at(makeGame("P2EVT", "LAR", "SF", 0, 0, "1"), KICKOFFS.P2EVT),
        makeGame("P3EVT", "NYJ", "BUF", 10, 3, "7", 4),
        at(makeGame("P4EVT", "NE", "MIA", 0, 0, "1"), KICKOFFS.P4EVT),
        at(makeGame("P5EVT", "CHI", "GB", 0, 0, "1"), KICKOFFS.P5EVT),
      ],
    };
  }
  return {
    events: [
      makeGame("P1EVT", "DEN", "KC", 7, 6, NONE_LIVE ? "3" : "2"),
      makeGame("P2EVT", "LAR", "SF", 0, 0, "1"),
      NONE_LIVE
        ? makeGame("P3EVT", "NYJ", "BUF", 10, 3, "3")
        : makeGame("P3EVT", "NYJ", "BUF", 10, 3, "7", 4),
      makeGame("P4EVT", "NE", "MIA", 0, 0, "1"),
    ],
  };
}

/** Opens Games with the reader's name set. */
export default async function run({ page, context, baseUrl }) {
  await registerAppMocks(context, {
    season: SEASON,
    week: WEEK,
    xlsxBuffer: buildPicksWorkbook(rows()),
    events,
  });

  if (SPREAD_DAYS) {
    await page.clock.setFixedTime(new Date(DAYS_NOW));
  }
  const path = `${baseUrl}/${SEASON}/${WEEK}/games`;
  await page.goto(path);
  await page.evaluate(
    ([themeKey, theme, nameKey, name, flagKey]) => {
      localStorage.setItem(themeKey, theme);
      localStorage.setItem(nameKey, name);
      localStorage.setItem(flagKey, "on");
    },
    [THEME_KEY, THEME, PLAYER_NAME_KEY, MY_NAME, EXPERIMENTAL_FEATURES_KEY],
  );
  await page.goto(path);
  await page.getByRole("listitem").first().waitFor({ timeout: 10000 });

  if (OPEN_DIALOG) {
    await page.goto(`${baseUrl}/${SEASON}/${WEEK}/picks`);
    await page
      .locator("tbody tr", { hasText: MY_NAME })
      .locator("td.table__pick button")
      .first()
      .click();
    await page.getByText("Game Status").waitFor({ timeout: 5000 });
    // The sheet slides up after it mounts.
    await page.waitForTimeout(1000);
  }
}
