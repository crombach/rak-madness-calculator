import {
  buildPicksWorkbook,
  makeGame,
  registerAppMocks,
} from "../lib/mocks.js";
import { SEASON, WEEK, THEME_KEY, PLAYER_NAME_KEY } from "../lib/constants.js";

/** `light` or `dark`. */
const THEME = process.env.PICK_THEME ?? "light";

/** `right` opens P2, which the reader's pick covered. `wrong` opens P1, which it lost. */
const RESULT = process.env.PICK_RESULT ?? "right";

/** The reader, whose pick the dialog says. */
const MY_NAME = "Dee";

function rows() {
  return [
    { Name: MY_NAME, P1: "KC -3", P2: "SF -6" },
    { Name: "Bob", P1: "DEN +3", P2: "LAR +6" },
    { Name: "Ann", P1: "KC -3", P2: "SF -6" },
  ];
}

/** Both games over. Denver beats Kansas City, San Francisco covers at Los Angeles. */
function events() {
  return {
    events: [
      makeGame("P1EVT", "DEN", "KC", 7, 6, "3"),
      makeGame("P2EVT", "LAR", "SF", 10, 27, "3"),
    ],
  };
}

/** Ends on Game Status for one of the reader's finished picks. */
export default async function run({ page, context, baseUrl }) {
  await registerAppMocks(context, {
    season: SEASON,
    week: WEEK,
    xlsxBuffer: buildPicksWorkbook(rows()),
    events,
  });

  const path = `${baseUrl}/${SEASON}/${WEEK}/picks`;
  await page.goto(path);
  await page.evaluate(
    ([themeKey, theme, nameKey, name]) => {
      localStorage.setItem(themeKey, theme);
      localStorage.setItem(nameKey, name);
    },
    [THEME_KEY, THEME, PLAYER_NAME_KEY, MY_NAME],
  );
  await page.goto(path);
  await page
    .locator("tbody tr", { hasText: MY_NAME })
    .locator("td.table__pick button")
    .nth(RESULT === "wrong" ? 0 : 1)
    .click();
  await page.getByText("Game Status").waitFor({ timeout: 10000 });
  // The sheet slides up after it mounts.
  await page.waitForTimeout(1000);
}
