import path from "node:path";
import {
  buildPicksWorkbook,
  makeGame,
  registerAppMocks,
} from "../lib/mocks.js";

const SEASON = 2024;
const WEEK = 5;
const THEME_KEY = "rak-madness:settings:theme";
const PLAYER_NAME_KEY = "rak-madness:settings:playerName";
// One of the names in ROWS below, so the scoreboard has a row to rule.
const MY_NAME = "Carol";

const ROWS = [
  { Name: "Alice", P1: "KC", P2: "SF", P3: "MIA" },
  { Name: "Bob", P1: "BUF", P2: "DAL", P3: "NYJ" },
  { Name: "Carol", P1: "KC", P2: "DAL", P3: "MIA" },
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

/**
 * Crops around one control with room to spare.
 *
 * A tight element crop cuts the lamp in half, because a chosen key sits sunk and
 * carries its lamp below the box the unsunk ones report.
 */
async function crop(page, locator, name) {
  const box = await locator.boundingBox();
  // Null for an element that is detached or laid out at no size. Named here, so
  // the run says which crop had nothing to measure rather than throwing on a
  // property of null.
  if (!box) throw new Error(`Nothing to crop for ${name}`);
  await page.screenshot({
    path: path.join(process.env.LED_SHOT_DIR ?? ".", `${name}.png`),
    clip: {
      x: box.x - PAD,
      y: box.y - PAD,
      width: box.width + PAD * 2,
      height: box.height + PAD * 2,
    },
  });
}

/** Loads a route with one theme and one name saved, the way a returning reader would. */
async function openIn(page, baseUrl, theme, route) {
  await page.goto(`${baseUrl}/`);
  await page.evaluate(
    ([themeKey, theme, nameKey, name]) => {
      localStorage.setItem(themeKey, theme);
      localStorage.setItem(nameKey, name);
    },
    [THEME_KEY, theme, PLAYER_NAME_KEY, MY_NAME],
  );
  await page.goto(`${baseUrl}${route}`);
  // A toast stands over the footer, and the settings button is under it.
  await page.addStyleTag({ content: ".toaster { display: none !important; }" });
}

/**
 * Shows the lamp that says which key in a row is chosen, on both controls that
 * draw one, in both themes.
 *
 * The navbar's Scoreboard/Picks switch sits on the darker `--rak-key-face` the
 * bar sets for itself. The settings dialog's theme switch sits on the default
 * one, so the two crops together cover both faces the lamp has to read against.
 */
export default async function run({ page, context, baseUrl }) {
  await registerAppMocks(context, {
    season: SEASON,
    week: WEEK,
    xlsxBuffer: buildPicksWorkbook(ROWS),
    events,
  });

  for (const theme of ["light", "dark"]) {
    await openIn(page, baseUrl, theme, `/${SEASON}/${WEEK}/scoreboard`);
    const nav = page.locator(".scores-nav");
    await nav.waitFor({ timeout: 20000 });
    await page.waitForTimeout(600);
    await crop(page, nav, `navbar-${theme}`);

    // The reader's own row, ruled in the same blue the lamp is lit in.
    const mine = page.locator("tr:has(.table__player-col.--mine)");
    await mine.first().waitFor({ timeout: 20000 });
    await crop(page, mine.first(), `my-row-${theme}`);

    await openIn(page, baseUrl, theme, "/");
    await page.getByRole("button", { name: "Settings" }).click();
    const choices = page.locator(".settings__choices");
    await choices.waitFor({ timeout: 20000 });
    await page.waitForTimeout(600);
    await crop(page, choices, `theme-${theme}`);

    // The two keys the home page ends on, which now carry a hue each. Both are
    // disabled until a week has been scored, so the mocked week is picked first.
    await page.keyboard.press("Escape");
    await page
      .locator(".home__week-input.select__trigger:not(.home__season-input)")
      .click();
    await page
      .getByRole("option", { name: `Week ${WEEK}`, exact: true })
      .click();
    const controls = page.locator(".home__controls");
    await controls.waitFor({ timeout: 20000 });
    // Both keys stay grey until the week has been scored, so wait for the last
    // of them to come up rather than for a fixed delay.
    await page
      .locator(".home__button:not([disabled])", { hasText: "Export Results" })
      .waitFor({ timeout: 20000 });
    await page.waitForTimeout(600);
    await crop(page, controls, `home-${theme}`);
  }
}
