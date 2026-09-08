import {
  buildPicksWorkbook,
  makeGame,
  registerAppMocks,
} from "../lib/mocks.js";

const SEASON = 2024;
const WEEK = 5;
// One of the rows below, and the row the dialog is opened on.
const SUBJECT = "Alice";

/**
 * Which branch to show. `headline` leaves eighteen games open, above
 * `MAX_SEARCHED_GAMES`. `paths` leaves five, under it.
 */
const PHASE = process.env.ANALYSIS_PHASE ?? "headline";

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

/**
 * `opposed` is open and picked both ways, which is what a route can turn on. Every
 * other open game is picked the same way by everyone, so it moves the field
 * together and decides nothing. `aliceWins` are the settled games Alice took, and
 * Bob took the rest, which is what puts him ahead of her.
 */
const PHASES = {
  headline: {
    settled: ["C1", "C2"],
    aliceWins: [],
    opposed: ["C3", "C4", "P1"],
  },
  paths: {
    settled: [
      "C1",
      "C2",
      "C3",
      "C4",
      "P1",
      "P2",
      "P3",
      "P4",
      "P5",
      "P6",
      "P7",
      "P8",
      "P9",
      "P10",
      "P11",
    ],
    aliceWins: ["C1", "C2", "C3", "C4", "P1", "P2", "P3"],
    opposed: ["P12", "P13", "P14", "P15", "P16"],
  },
};

const shape = PHASES[PHASE];
if (shape == null) {
  throw new Error(`ANALYSIS_PHASE has to be headline or paths, not ${PHASE}`);
}

const isSettled = (key) => shape.settled.includes(key);
const isOpposed = (key) => shape.opposed.includes(key);

function rows() {
  const pick = (game, who) => {
    if (isSettled(game.key)) {
      // Carol misses every settled game, so she trails without being knocked out.
      if (who === "carol") return game.away;
      const alice = shape.aliceWins.includes(game.key) ? "home" : "away";
      const mine = who === "alice" ? alice : alice === "home" ? "away" : "home";
      return game[mine];
    }
    // Carol shadows Alice through the open games, so she never bears on Alice's
    // own routes.
    if (isOpposed(game.key) && who === "bob") return game.away;
    return game.home;
  };
  const row = (name, who, tiebreaker) => {
    const cells = { Name: name };
    GAMES.forEach((game) => {
      cells[game.key] = pick(game, who);
    });
    cells.Pts = tiebreaker;
    return cells;
  };
  return [
    row("Alice", "alice", 45),
    row("Bob", "bob", 48),
    row("Carol", "carol", 41),
  ];
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

/** Opens Player Analysis on a player who is behind, and ends on the dialog. */
export default async function run({ page, context, baseUrl }) {
  await registerAppMocks(context, {
    season: SEASON,
    week: WEEK,
    xlsxBuffer: buildPicksWorkbook(rows()),
    events: () => eventsFor("pro"),
    collegeEvents: () => eventsFor("college"),
  });

  await page.goto(`${baseUrl}/${SEASON}/${WEEK}/scoreboard`);
  await page.getByRole("button", { name: new RegExp(SUBJECT) }).click();
  await page.getByText("Player Analysis").waitFor({ timeout: 10000 });
  // The answer replaces the bar that stands over the search while it runs.
  await page
    .locator(".analysis__body")
    .first()
    .waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(1200);
}
