import {
  buildPicksWorkbook,
  makeGame,
  registerAppMocks,
} from "../lib/mocks.js";

const SEASON = 2024;
const WEEK = 5;
const THEME_KEY = "rak-madness:settings:theme";
// Swing Games shows only to a reader who opted in to experimental features.
const EXPERIMENTAL_FEATURES_KEY = "rak-madness:settings:experimentalFeatures";

/** `light` or `dark`. */
const THEME = process.env.NAV_THEME ?? "light";

/** `popup` hovers the disabled item open at wide-screen. `drawer` just opens it. */
const MODE = process.env.NAV_MODE ?? "popup";

/** `disabled` leaves Swing Games disabled. `enabled` leaves a game open to split. */
const STATE = process.env.NAV_STATE ?? "disabled";

/** Both players on the same side of the week's one open game, so it decides nothing. */
function disabledRows() {
  return [
    { Name: "Ann", P1: "KC -3" },
    { Name: "Ben", P1: "KC -3" },
  ];
}

/** Still open, so the week is not settled, but nobody is split by it. */
function disabledEvents() {
  return { events: [makeGame("P1EVT", "DEN", "KC", 0, 0, "1")] };
}

/** Opposite sides of the week's one open game, so it decides both their weeks. */
function enabledRows() {
  return [
    { Name: "Ann", P1: "KC -3" },
    { Name: "Ben", P1: "DEN +3" },
  ];
}

/** Still open, so the split above is a live swing rather than a settled one. */
function enabledEvents() {
  return { events: [makeGame("P1EVT", "DEN", "KC", 0, 0, "1")] };
}

/** Opens the nav menu on a week with Swing Games in the given state and theme. */
export default async function run({ page, context, baseUrl }) {
  await registerAppMocks(context, {
    season: SEASON,
    week: WEEK,
    xlsxBuffer: buildPicksWorkbook(
      STATE === "enabled" ? enabledRows() : disabledRows(),
    ),
    events: STATE === "enabled" ? enabledEvents : disabledEvents,
  });

  const url = `${baseUrl}/${SEASON}/${WEEK}/scoreboard`;
  await page.goto(url);
  await page.evaluate(
    ([key, theme, flagKey]) => {
      localStorage.setItem(key, theme);
      localStorage.setItem(flagKey, "on");
    },
    [THEME_KEY, THEME, EXPERIMENTAL_FEATURES_KEY],
  );
  await page.goto(url);

  const trigger = page.getByRole("button", { name: "Menu" });
  await trigger.waitFor({ timeout: 10000 });
  await trigger.click();

  const item = page.getByText("Swing Games").last();
  await item.waitFor();
  // The drawer slides in, so a shot taken on sight catches it part way.
  await page.waitForFunction(
    "document.getAnimations().every((a) => a.playState !== 'running')",
  );

  if (MODE === "popup" && STATE === "disabled") {
    await item.hover();
    await page.getByRole("tooltip").waitFor({ state: "visible" });
  }
}
