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
  PLAYER_NAME_KEY,
} from "../lib/constants.js";

/** `light` or `dark`. */
const THEME = process.env.LIVE_THEME ?? "light";

/** The reader, whose pick each scoreboard says. */
const MY_NAME = "Dee";

/** P1 live, P3 delayed, P2 and P4 not started, so the page lists two games. */
function rows() {
  return [
    { Name: MY_NAME, P1: "KC -3", P2: "SF -6", P3: "BUF", P4: "MIA +2" },
    { Name: "Bob", P1: "DEN +3", P2: "LAR +6", P3: "NYJ", P4: "NE -2" },
  ];
}

function events() {
  return {
    events: [
      makeGame("P1EVT", "DEN", "KC", 7, 6, "2"),
      makeGame("P2EVT", "LAR", "SF", 0, 0, "1"),
      makeGame("P3EVT", "NYJ", "BUF", 10, 3, "7", 4),
      makeGame("P4EVT", "NE", "MIA", 0, 0, "1"),
    ],
  };
}

/** Opens Live Games with the reader's name set. */
export default async function run({ page, context, baseUrl }) {
  await registerAppMocks(context, {
    season: SEASON,
    week: WEEK,
    xlsxBuffer: buildPicksWorkbook(rows()),
    events,
  });

  const path = `${baseUrl}/${SEASON}/${WEEK}/live`;
  await page.goto(path);
  await page.evaluate(
    ([themeKey, theme, nameKey, name, flagKey]) => {
      localStorage.setItem(themeKey, theme);
      localStorage.setItem(nameKey, name);
      localStorage.setItem(flagKey, "on");
    },
    [THEME_KEY, THEME, PLAYER_NAME_KEY, MY_NAME, EXPERIMENTAL_FEATURES_KEY],
  );
  await page.goto(path);
  await page.getByRole("listitem").first().waitFor({ timeout: 10000 });
}
