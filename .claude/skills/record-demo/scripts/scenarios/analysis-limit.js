import {
  buildPicksWorkbook,
  makeGame,
  registerAppMocks,
} from "../lib/mocks.js";

const SEASON = 2024;
const WEEK = 5;

/** Which shape of answer to show. One of `PHASES`. */
const PHASE = process.env.ANALYSIS_PHASE ?? "headline";

/** Which theme to render in, since the blue an `And` is set in has one of each. */
const THEME = process.env.ANALYSIS_THEME ?? "light";

const THEME_KEY = "rak-madness:settings:theme";

/** Four college then sixteen pro, the order a sheet's columns run in. */
const GAMES = [
  { key: "C1", league: "college", home: "UGA", away: "ALA" },
  { key: "C2", league: "college", home: "OSU", away: "MICH" },
  { key: "C3", league: "college", home: "TEX", away: "OU" },
  { key: "C4", league: "college", home: "ORE", away: "WASH" },
  { key: "P1", league: "pro", home: "KC", away: "BUF" },
  { key: "P2", league: "pro", home: "SF", away: "DAL" },
  { key: "P3", league: "pro", home: "PHI", away: "NYG" },
  { key: "P4", league: "pro", home: "BAL", away: "CIN" },
  { key: "P5", league: "pro", home: "DET", away: "GB" },
  { key: "P6", league: "pro", home: "MIA", away: "NYJ" },
  { key: "P7", league: "pro", home: "HOU", away: "IND" },
  { key: "P8", league: "pro", home: "LAR", away: "SEA" },
  { key: "P9", league: "pro", home: "TB", away: "ATL" },
  { key: "P10", league: "pro", home: "MIN", away: "CHI" },
  { key: "P11", league: "pro", home: "PIT", away: "CLE" },
  { key: "P12", league: "pro", home: "DEN", away: "LAC" },
  { key: "P13", league: "pro", home: "NO", away: "CAR" },
  { key: "P14", league: "pro", home: "JAX", away: "TEN" },
  { key: "P15", league: "pro", home: "WSH", away: "ARI" },
  { key: "P16", league: "pro", home: "LV", away: "NE" },
];

const KEYS = GAMES.map((game) => game.key);

/** Every column up to and including `key`, which is how a phase names its settled games. */
function upTo(key) {
  return KEYS.slice(0, KEYS.indexOf(key) + 1);
}

/**
 * A row in the sheet.
 *
 * `wins` names the settled games this player got right, and every settled game
 * left out is one they missed. `open` is the side they back in every game still to
 * be played, and `picks` names the open games they back the other way, or leave
 * blank with `null`. The home side wins every settled game, so `wins` is read
 * against `home`.
 */
function player(name, points, wins, open, picks = {}) {
  return { name, points, wins, open, picks };
}

/** The settled games a player wins to land on a given score, college first. */
const AT = Object.fromEntries(
  [1, 2, 8, 9, 19].map((score) => [score, KEYS.slice(0, score)]),
);

/**
 * One week each, built to land on a shape the dialog renders differently. Every
 * score below is a count of settled wins, and each rival's gap to Alice is what
 * decides how many open games she needs and whether they only leave her tied.
 */
const PHASES = {
  // Eighteen games open, over `MAX_SEARCHED_GAMES`: the floor, the must-win games
  // proven off it, and the note saying what is held back.
  headline: {
    settled: ["C1", "C2"],
    subject: "Alice",
    rows: [
      player("Alice", 45, [], "home"),
      player("Bob", 48, ["C1", "C2"], "home", {
        C3: "away",
        C4: "away",
        P1: "away",
      }),
      player("Carol", 41, [], "home"),
    ],
  },
  // One rival a point ahead across five opposed games, which is one pool of one
  // size: any three of them, and then the tiebreaker.
  paths: {
    settled: upTo("P11"),
    subject: "Alice",
    rows: [
      player("Alice", 45, ["C1", "C2", "C3", "C4", "P1", "P2", "P3"], "home"),
      player(
        "Bob",
        48,
        ["P4", "P5", "P6", "P7", "P8", "P9", "P10", "P11"],
        "away",
      ),
      player("Carol", 41, [], "home"),
    ],
  },
  // Carol cannot be caught up, read off the same week as `paths`.
  knockedOut: null,
  // Two rivals at different distances. Dave is only reachable through P12, which
  // makes it must-win, and Bob is level, which makes the rest a pool of two.
  chain: {
    settled: upTo("P11"),
    subject: "Alice",
    rows: [
      player("Alice", 45, AT[8], "home"),
      player("Bob", 48, AT[8], "home", {
        P13: "away",
        P14: "away",
        P15: "away",
        P16: "away",
      }),
      player("Dave", 50, AT[9], "home", { P12: "away" }),
      player("Carol", 41, AT[2], "home"),
    ],
  },
  // Three rivals over overlapping sets of games, so no one pool covers them and
  // the answer is a list of routes, each with its own total to hit.
  routes: {
    settled: upTo("P11"),
    subject: "Alice",
    rows: [
      player("Alice", 45, AT[8], "home"),
      player("Bob", 48, AT[9], "home", {
        P12: "away",
        P13: "away",
        P14: "away",
      }),
      player("Dave", 50, AT[9], "home", {
        P14: "away",
        P15: "away",
        P16: "away",
      }),
      player("Erin", 41, AT[8], "home", { P12: "away", P16: "away" }),
      player("Carol", 38, AT[2], "home"),
    ],
  },
  // Alice left P15 blank, so nothing she does decides it and Bob has to miss it.
  help: {
    settled: upTo("P14"),
    subject: "Alice",
    rows: [
      player("Alice", 45, AT[8], "home", { P15: null }),
      player("Bob", 48, AT[9], "home", { P16: "away" }),
      player("Carol", 41, AT[1], "home"),
    ],
  },
  // Nineteen games gone Alice's way and none anyone else's, so the last one cannot
  // take the week off her.
  clinched: {
    settled: upTo("P15"),
    subject: "Alice",
    rows: [
      player("Alice", 45, AT[19], "home"),
      player("Bob", 48, [], "home"),
      player("Carol", 41, [], "away"),
    ],
  },
};

PHASES.knockedOut = { ...PHASES.paths, subject: "Carol" };

const phase = PHASES[PHASE];
if (phase == null) {
  throw new Error(
    `ANALYSIS_PHASE has to be one of ${Object.keys(PHASES).join(", ")}, not ${PHASE}`,
  );
}

const isSettled = (key) => phase.settled.includes(key);

function rows() {
  return phase.rows.map((row) => {
    const cells = { Name: row.name };
    GAMES.forEach((game) => {
      if (isSettled(game.key)) {
        cells[game.key] = row.wins.includes(game.key) ? game.home : game.away;
        return;
      }
      const side = game.key in row.picks ? row.picks[game.key] : row.open;
      // `null` rather than a key left off, which the sheet builder would append
      // after the columns every row does carry, and so relabel the games.
      cells[game.key] = side == null ? null : game[side];
    });
    cells.Pts = row.points;
    return cells;
  });
}

/** The home side won every game that has been played. */
function eventsFor(league) {
  return {
    events: GAMES.filter((game) => game.league === league).map((game) =>
      isSettled(game.key)
        ? makeGame(`${game.key}EVT`, game.home, game.away, 27, 20, "3")
        : makeGame(`${game.key}EVT`, game.home, game.away, 0, 0, "1"),
    ),
  };
}

/** Opens Player Analysis on the phase's own row, and ends on the dialog. */
export default async function run({ page, context, baseUrl }) {
  await registerAppMocks(context, {
    season: SEASON,
    week: WEEK,
    xlsxBuffer: buildPicksWorkbook(rows()),
    events: () => eventsFor("pro"),
    collegeEvents: () => eventsFor("college"),
  });

  await page.goto(`${baseUrl}/${SEASON}/${WEEK}/scoreboard`);
  await page.evaluate(
    ([key, theme]) => localStorage.setItem(key, theme),
    [THEME_KEY, THEME],
  );
  await page.goto(`${baseUrl}/${SEASON}/${WEEK}/scoreboard`);
  await page.getByRole("button", { name: new RegExp(phase.subject) }).click();
  await page.getByText("Player Analysis").waitFor({ timeout: 10000 });
  // The answer replaces the bar that stands over the search while it runs.
  await page
    .locator(".analysis__body")
    .first()
    .waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(1200);
}
