import {
  buildPicksWorkbook,
  makeGame,
  registerAppMocks,
} from "../lib/mocks.js";

const SEASON = 2024;
const WEEK = 5;
const THEME_KEY = "rak-madness:settings:theme";
const SETTINGS_SEEN_KEY = "rak-madness:settings:settingsSeenAt";

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

/** Three full cycles of the 1.6s pulse, which is what reads as a breath. */
const PULSE_HOLD = 5000;

/**
 * The footer's Settings control pulsing at a reader who has never opened it, and
 * going quiet the moment they do.
 *
 * The theme comes from `$PULSE_THEME`, since the pulse has a color in each and one
 * clip cannot hold both. Run it twice.
 */
export default async function run({ page, context, baseUrl }) {
  const theme = process.env.PULSE_THEME ?? "light";

  await registerAppMocks(context, {
    season: SEASON,
    week: WEEK,
    xlsxBuffer: buildPicksWorkbook(ROWS),
    events,
  });

  await page.goto(`${baseUrl}/`);
  // A reader who has chosen a theme but has never opened the settings, which is
  // the state the pulse is for.
  await page.evaluate(
    ([themeKey, theme, seenKey]) => {
      localStorage.setItem(themeKey, theme);
      localStorage.removeItem(seenKey);
    },
    [THEME_KEY, theme, SETTINGS_SEEN_KEY],
  );
  await page.goto(`${baseUrl}/`);
  // A toast stands over the footer, and the settings button is under it.
  await page.addStyleTag({ content: ".toaster { display: none !important; }" });

  const settings = page.getByRole("button", { name: "Settings" });
  await settings.waitFor({ timeout: 20000 });
  await page.waitForTimeout(PULSE_HOLD);

  await settings.click();
  await page.locator(".dialog__popup").waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);

  // Back to the footer, where the control is now the same gray as its neighbors.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(2500);
}
