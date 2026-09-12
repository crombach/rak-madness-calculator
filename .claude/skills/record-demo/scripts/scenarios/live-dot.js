import path from "node:path";
import {
  buildPicksWorkbook,
  makeGame,
  registerAppMocks,
} from "../lib/mocks.js";

const SEASON = 2024;
const WEEK = 5;
const THEME_KEY = "rak-madness:settings:theme";
// How far down the table to crop, which is the header plus a few rows. The dot
// is what the shot is about, and a full-height table shrinks it in the frame.
const CROP_HEIGHT = 230;
// Room above the table, so its own top edge is not the crop's.
const CROP_PAD = 8;

const ROWS = [
  { Name: "Alice", P1: "KC", P2: "SF", P3: "MIA", P4: "GB", P5: "BAL" },
  { Name: "Bob", P1: "BUF", P2: "DAL", P3: "NYJ", P4: "CHI", P5: "CIN" },
  { Name: "Carol", P1: "KC", P2: "DAL", P3: "MIA", P4: "GB", P5: "BAL" },
  { Name: "Dave", P1: "BUF", P2: "SF", P3: "NYJ", P4: "CHI", P5: "CIN" },
  { Name: "Erin", P1: "KC", P2: "SF", P3: "MIA", P4: "GB", P5: "CIN" },
];

// P2 and P4 are being played. The rest are over, so one shot carries both the
// marked and the unmarked heading side by side.
function events() {
  return {
    events: [
      makeGame("P1EVT", "KC", "BUF", 24, 17, "3"),
      makeGame("P2EVT", "SF", "DAL", 14, 10, "2"),
      makeGame("P3EVT", "NYJ", "MIA", 16, 20, "3"),
      makeGame("P4EVT", "CHI", "GB", 7, 7, "2"),
      makeGame("P5EVT", "BAL", "CIN", 24, 17, "3"),
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

/** The table from its top edge down, wide enough to reach the pro columns. */
async function shoot(page, theme) {
  const box = await page.locator("table").boundingBox();
  if (!box) throw new Error(`No table to crop for ${theme}`);
  await page.screenshot({
    path: path.join(
      process.env.LIVE_DOT_SHOT_DIR ?? ".",
      `picks-live-dot-${theme}.png`,
    ),
    clip: {
      x: box.x,
      y: box.y - CROP_PAD,
      width: Math.min(box.width, page.viewportSize().width - box.x),
      height: CROP_HEIGHT,
    },
  });
}

/**
 * The dot marking a game being played, beside its column heading's label.
 *
 * Shot in both themes, because the header band the dot sits on inverts between
 * them while the dot's own red holds still.
 *
 * Run it at `--viewport 900x900`. The crop stops at the viewport's own edge, and
 * a phone-width run ends before the columns being played.
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
    await shoot(page, theme);
  }
}
