import {
  buildPicksWorkbook,
  makeGame,
  registerAppMocks,
} from "../lib/mocks.js";
import {
  SEASON,
  WEEK,
  THEME_KEY,
  EXPERIMENTAL_FEATURES_KEY,
} from "../lib/constants.js";

/** `light` or `dark`. */
const THEME = process.env.NAV_THEME ?? "light";

/** `popup` opens the wide-screen menu. `drawer` opens the drawer, so needs `--touch`. */
const MODE = process.env.NAV_MODE ?? "popup";

/** `disabled` leaves Knockouts disabled. `enabled` leaves a game open to split. */
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

/** Still open, so the split above is a live knockout rather than a settled one. */
function enabledEvents() {
  return { events: [makeGame("P1EVT", "DEN", "KC", 0, 0, "1")] };
}

/** Opens the nav menu on a week with Knockouts in the given state and theme. */
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
  if (MODE === "drawer") await trigger.tap();
  else await trigger.click();

  const item = page.getByText("Knockouts").last();
  await item.waitFor();
  // The drawer slides in, so a shot taken on sight catches it part way.
  await page.waitForFunction(
    "document.getAnimations().every((a) => a.playState !== 'running')",
  );
}
