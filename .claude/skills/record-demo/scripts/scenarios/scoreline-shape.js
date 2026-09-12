import {
  buildPicksWorkbook,
  makeGame,
  registerAppMocks,
} from "../lib/mocks.js";

const SEASON = 2024;
const WEEK = 5;

/** Where to write the shots. `--out` is a throwaway for this scenario. */
const SHOT_DIR = process.env.SCORELINE_SHOT_DIR ?? "/tmp/shots";

/** Which theme to render in, since the readout's plate has one of each. */
const THEME = process.env.SCORELINE_THEME ?? "dark";

const THEME_KEY = "rak-madness:settings:theme";

const ROWS = [
  { Name: "Alice", P1: "KC", P2: "SF", P3: "MIA", P4: "GB", P5: "BAL" },
  { Name: "Bob", P1: "BUF", P2: "DAL", P3: "NYJ", P4: "CHI", P5: "CIN" },
];

/**
 * P1 level at nothing and still being played, which is the pair of single figures
 * the two sides have to sit level about. P5 has not kicked off, so the list below
 * carries a `SOON` mark beside the other three.
 */
function events() {
  return {
    events: [
      makeGame("P1EVT", "KC", "BUF", 0, 0, "2"),
      makeGame("P2EVT", "SF", "DAL", 27, 20, "3"),
      makeGame("P3EVT", "NYJ", "MIA", 16, 20, "3"),
      makeGame("P4EVT", "CHI", "GB", 10, 24, "2"),
      makeGame("P5EVT", "BAL", "CIN", 0, 0, "1"),
    ],
  };
}

/** The readout and, under it, the list the marks are read off. */
export default async function run({ page, context, baseUrl }) {
  await registerAppMocks(context, {
    season: SEASON,
    week: WEEK,
    xlsxBuffer: buildPicksWorkbook(ROWS),
    events,
  });
  await page.goto(`${baseUrl}/${SEASON}/${WEEK}/picks`);
  await page.evaluate(
    ([key, theme]) => localStorage.setItem(key, theme),
    [THEME_KEY, THEME],
  );
  await page.goto(`${baseUrl}/${SEASON}/${WEEK}/picks`);
  await page.waitForSelector("td.table__pick", { timeout: 20000 });
  await page.waitForTimeout(500);

  await page
    .locator("tbody tr")
    .first()
    .locator("td.table__pick")
    .first()
    .locator("button")
    .click();
  await page.getByText("Game Status").waitFor({ timeout: 5000 });
  await page.waitForTimeout(1200);

  const dialog = page.locator(".dialog__popup");
  await dialog.screenshot({ path: `${SHOT_DIR}/scoreline-${THEME}.png` });

  // The list carries every game's mark, which is the only place `SOON` is drawn.
  await page.getByRole("combobox").click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOT_DIR}/marks-${THEME}.png` });
}
