import path from "node:path";
import {
  buildPicksWorkbook,
  makeGame,
  registerAppMocks,
} from "../lib/mocks.js";

const SEASON = 2024;
const WEEK = 5;
const THEME_KEY = "rak-madness:settings:theme";

/** Where to write the shots. `--out` is a throwaway for this scenario. */
const SHOT_DIR = process.env.DELAYED_SHOT_DIR ?? "/tmp/shots";

// How far down the table to crop, which is the header plus a few rows, and the
// room left above it so the table's own top edge is not the crop's.
const CROP_HEIGHT = 230;
const CROP_PAD = 8;

const ROWS = [
  { Name: "Alice", P1: "KC", P2: "SF", P3: "BAL", P4: "GB" },
  { Name: "Bob", P1: "BUF", P2: "DAL", P3: "CIN", P4: "CHI" },
  { Name: "Carol", P1: "KC", P2: "DAL", P3: "BAL", P4: "CHI" },
];

/**
 * P1 stopped in the fourth quarter and P3 stopped before kickoff, which are the
 * two things the word is said differently for. P2 is being played and P4 is over,
 * so the pause and the dot are read against each other and against a heading
 * wearing nothing.
 */
function events() {
  return {
    events: [
      makeGame("P1EVT", "KC", "BUF", 10, 3, "7", 4),
      makeGame("P2EVT", "SF", "DAL", 14, 10, "2"),
      makeGame("P3EVT", "BAL", "CIN", 0, 0, "7", 0),
      makeGame("P4EVT", "CHI", "GB", 24, 17, "3"),
    ],
  };
}

/** Loads the picks table with one theme saved, the way a returning reader would. */
async function openPicks(page, baseUrl, theme) {
  await page.goto(`${baseUrl}/`);
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [THEME_KEY, theme],
  );
  await page.goto(`${baseUrl}/${SEASON}/${WEEK}/picks`);
  await page.waitForSelector("td.table__pick", { timeout: 20000 });
  // A toast stands over the table's bottom edge.
  await page.addStyleTag({ content: ".toaster { display: none !important; }" });
  await page.waitForTimeout(600);
}

/** The headings, wide enough to hold the pause, the dot and a bare one at once. */
async function shootHeadings(page, theme) {
  const box = await page.locator("table").boundingBox();
  if (!box) throw new Error(`No table to crop for ${theme}`);
  await page.screenshot({
    path: path.join(SHOT_DIR, `picks-delay-icon-${theme}.png`),
    clip: {
      x: box.x,
      y: box.y - CROP_PAD,
      width: Math.min(box.width, page.viewportSize().width - box.x),
      height: CROP_HEIGHT,
    },
  });
}

/** The dialog on one column's game, cropped to the popup. */
async function shootDialog(page, column, name) {
  await page
    .getByRole("columnheader", { name: new RegExp(`^${column}`) })
    .getByRole("button")
    .click();
  await page.getByText("Game Status").waitFor({ timeout: 5000 });
  await page.waitForTimeout(1200);
  await page.locator(".dialog__popup").screenshot({
    path: path.join(SHOT_DIR, `${name}.png`),
  });
}

/**
 * How a delayed game reads: the pause on its column heading, the word over the
 * scores with the quarter it stopped in, the same word alone for one stopped
 * before kickoff, and the `DLAY` mark the search list carries.
 *
 * Run it at `--viewport 900x900`. The heading crop stops at the viewport's own
 * edge, and a phone-width run ends before the columns it is about.
 */
export default async function run({ page, context, baseUrl }) {
  await registerAppMocks(context, {
    season: SEASON,
    week: WEEK,
    xlsxBuffer: buildPicksWorkbook(ROWS),
    events,
  });

  for (const theme of ["light", "dark"]) {
    await openPicks(page, baseUrl, theme);
    await shootHeadings(page, theme);
  }

  // The dialog opens once per load, since Base UI leaves its focus guards behind.
  await openPicks(page, baseUrl, "dark");
  await shootDialog(page, "P1", "delayed-quarter");
  // The list is the only place the mark is drawn, beside every other game's.
  await page.getByRole("combobox").click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SHOT_DIR, "delayed-marks.png") });

  await openPicks(page, baseUrl, "dark");
  await shootDialog(page, "P3", "delayed-pregame");
}
