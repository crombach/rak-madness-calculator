import path from "node:path";
import {
  buildPicksWorkbook,
  makeGame,
  registerAppMocks,
} from "../lib/mocks.js";

const SEASON = 2024;
const WEEK = 5;
const THEME_KEY = "rak-madness:settings:theme";

const ROWS = [
  { Name: "Alice", P1: "KC", P2: "SF", P3: "MIA" },
  { Name: "Bob", P1: "BUF", P2: "DAL", P3: "NYJ" },
];

function events() {
  return {
    events: [
      makeGame("P1EVT", "KC", "BUF", 24, 17, "3"),
      makeGame("P2EVT", "SF", "DAL", 27, 20, "3"),
      makeGame("P3EVT", "NYJ", "MIA", 16, 20, "3"),
    ],
  };
}

const PAD = 10;

/** Crops around one control with room to spare, since a sunk key carries its edge below its box. */
async function crop(page, locator, name) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Nothing to crop for ${name}`);
  await page.screenshot({
    path: path.join(process.env.PRESSED_SHOT_DIR ?? ".", `${name}.png`),
    clip: {
      x: box.x - PAD,
      y: box.y - PAD,
      width: box.width + PAD * 2,
      height: box.height + PAD * 2,
    },
  });
}

/**
 * The refresh button at rest and while its work runs, in both themes.
 *
 * The pointer is moved off the key before each shot. A key under the pointer
 * carries its hover fill, and the question here is where the key stands, which
 * that fill would be read as answering.
 */
export default async function run({ page, context, baseUrl }) {
  await registerAppMocks(context, {
    season: SEASON,
    week: WEEK,
    xlsxBuffer: buildPicksWorkbook(ROWS),
    events,
  });

  for (const theme of ["light", "dark"]) {
    await page.goto(`${baseUrl}/`);
    await page.evaluate(
      ([key, value]) => localStorage.setItem(key, value),
      [THEME_KEY, theme],
    );
    await page.goto(`${baseUrl}/${SEASON}/${WEEK}/scoreboard`);

    const nav = page.locator(".scores-nav");
    await nav.waitFor({ timeout: 20000 });
    const refresh = page.getByRole("button", { name: "Refresh" });
    await refresh.waitFor({ timeout: 20000 });
    await page.waitForTimeout(600);
    await page.mouse.move(0, 0);
    await crop(page, refresh, `refresh-rest-${theme}`);

    // `REFRESHING_FLOOR_MS` holds the key down for at least half a second, so
    // the shot lands inside the state rather than racing it.
    await refresh.click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(150);
    await crop(page, refresh, `refresh-busy-${theme}`);
  }
}
