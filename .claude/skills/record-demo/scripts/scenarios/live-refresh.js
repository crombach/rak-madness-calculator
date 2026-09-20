import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildPicksWorkbook,
  makeGame,
  registerAppMocks,
} from "../lib/mocks.js";

const SEASON = 2024;
const WEEK = 5;

/** Where the app names the interval this scenario has to wait out. */
const POLL_SOURCE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../..",
  "src/hooks/useLiveGame.ts",
);

/**
 * `POLL_MS`, read out of the hook rather than copied here.
 *
 * A copy went stale the one time the app moved the interval, and the scenario
 * then stopped the recording before the poll it is about had fired.
 */
function pollMs() {
  const source = fs.readFileSync(POLL_SOURCE, "utf8");
  const found = source.match(/export const POLL_MS = ([\d_]+)/);
  if (found == null) {
    throw new Error(`No POLL_MS in ${POLL_SOURCE}`);
  }
  return Number(found[1].replaceAll("_", ""));
}

// Real time. One second over the poll itself, for the mocked fetch and the
// rescoring pass to land. Never move `POLL_MS` to make this recording shorter,
// since the recording is worth having only while the poll is the real one.
const POLL_WAIT_MS = pollMs() + 1_000;

const ROWS = [
  {
    Name: "Alice",
    P1: "KC",
    P2: "SF",
    P3: "MIA",
    P4: "GB",
    P5: "BAL",
    P6: "LAC",
  },
  {
    Name: "Bob",
    P1: "BUF",
    P2: "DAL",
    P3: "NYJ",
    P4: "CHI",
    P5: "CIN",
    P6: "DEN",
  },
  {
    Name: "Carol",
    P1: "KC",
    P2: "DAL",
    P3: "MIA",
    P4: "CHI",
    P5: "BAL",
    P6: "LAC",
  },
  {
    Name: "Dave",
    P1: "BUF",
    P2: "SF",
    P3: "NYJ",
    P4: "GB",
    P5: "CIN",
    P6: "LAC",
  },
  {
    Name: "Erin",
    P1: "KC",
    P2: "SF",
    P3: "NYJ",
    P4: "GB",
    P5: "BAL",
    P6: "DEN",
  },
  {
    Name: "Frank",
    P1: "BUF",
    P2: "DAL",
    P3: "MIA",
    P4: "CHI",
    P5: "CIN",
    P6: "LAC",
  },
  {
    Name: "Grace",
    P1: "KC",
    P2: "SF",
    P3: "MIA",
    P4: "",
    P5: "BAL",
    P6: "LAC",
  },
  {
    Name: "Heidi",
    P1: "BUF",
    P2: "DAL",
    P3: "NYJ",
    P4: "CHI",
    P5: "BAL",
    P6: "DEN",
  },
];

function events(gameOneFinal) {
  return {
    events: [
      makeGame(
        "P1EVT",
        "KC",
        "BUF",
        gameOneFinal ? 24 : 7,
        gameOneFinal ? 17 : 3,
        gameOneFinal ? "3" : "2",
      ),
      makeGame("P2EVT", "SF", "DAL", 27, 20, "3"),
      makeGame("P3EVT", "NYJ", "MIA", 16, 20, "3"),
      makeGame("P4EVT", "CHI", "GB", 10, 24, "3"),
      makeGame("P5EVT", "BAL", "CIN", 24, 17, "3"),
      makeGame("P6EVT", "DEN", "LAC", 13, 27, "3"),
    ],
  };
}

/**
 * Opens the Game Status dialog on a still-live pick, then does nothing until
 * the dialog's own background poll (not a click, not the navbar refresh
 * button) discovers the game went final. Proves `useLiveGame`'s `onPoll` ->
 * `GameStatusDialog`'s `onPoll` -> `ResultsLayout`'s `rescore` wiring: the
 * table's pick colors update and its `.table__cell-wipe` animation plays on
 * their own.
 */
export default async function run({ page, context, baseUrl }) {
  const state = { gameOneFinal: false };
  await registerAppMocks(context, {
    season: SEASON,
    week: WEEK,
    xlsxBuffer: buildPicksWorkbook(ROWS),
    events: () => events(state.gameOneFinal),
  });

  await page.goto(`${baseUrl}/${SEASON}/${WEEK}/picks`);
  await page.waitForSelector("td.table__pick", { timeout: 20000 });
  await page.waitForTimeout(500);

  // Row 0 ranks first already (score ties resolve to insertion order here).
  // Its first `.table__pick` cell is P1, since this fixture has no college
  // columns. Click it to open the Game Status dialog on the still-live game.
  const firstPickButton = page
    .locator("tbody tr")
    .first()
    .locator("td.table__pick")
    .first()
    .locator("button");
  await firstPickButton.click();
  await page.getByText("Game Status").waitFor({ timeout: 5000 });
  await page.waitForTimeout(1500);

  state.gameOneFinal = true; // The next poll reads this. Nothing else pokes the app

  await page.waitForTimeout(POLL_WAIT_MS);

  // The dialog's own search-combobox label resets around here (a pre-existing
  // Base UI Combobox quirk: `scores.games` is rebuilt fresh on every scoring
  // pass, so the combobox's stale item reference stops matching). This is
  // orthogonal to this fix, so close the dialog to end on the table's own
  // updated colors rather than dwelling on it.
  await page.getByRole("button", { name: "Close" }).click();
  await page.waitForTimeout(600);
}
