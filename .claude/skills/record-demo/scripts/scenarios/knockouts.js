import {
  buildPicksWorkbook,
  makeGame,
  registerAppMocks,
} from "../lib/mocks.js";
import { SEASON, WEEK, THEME_KEY, PLAYER_NAME_KEY } from "../lib/constants.js";

/** `light` or `dark`. */
const THEME = process.env.KNOCKOUTS_THEME ?? "light";

/** Set to hover the first game's game button before the final screenshot. */
const HOVER = process.env.KNOCKOUTS_HOVER === "1";

/** The reader, a KC backer, so their name leads P1's crowded side. */
const MY_NAME = "Dee";

const KC_BACKERS = [
  "Ann",
  "Ben",
  "Cal",
  "Dee",
  "Eli",
  "Fay",
  "Gus",
  "Hal",
  "Ivo",
];

/**
 * Two open pro games, neither settled, so both are knockouts: P1 crowded on one
 * side, P2 level between its two. Every player starts at the same baseline
 * with nothing else picked, so each game decides on its own.
 */
function rows() {
  return [
    ...KC_BACKERS.map((name) => ({ Name: name, P1: "KC -3", P2: "" })),
    { Name: "Bob", P1: "DEN +3", P2: "" },
    { Name: "Xen", P1: "", P2: "SF -6" },
    { Name: "Yan", P1: "", P2: "LAR +6" },
  ];
}

/** P1 live and close enough to go either way, P2 yet to start. */
function events() {
  return {
    events: [
      makeGame("P1EVT", "DEN", "KC", 7, 6, "2", 3),
      makeGame("P2EVT", "LAR", "SF", 0, 0, "1"),
    ],
  };
}

/** Opens the knockouts page, in the given theme, ending on a game's game button hovered if asked. */
export default async function run({ page, context, baseUrl }) {
  await registerAppMocks(context, {
    season: SEASON,
    week: WEEK,
    xlsxBuffer: buildPicksWorkbook(rows()),
    events,
  });

  await page.goto(`${baseUrl}/${SEASON}/${WEEK}/knockouts`);
  await page.evaluate(
    ([themeKey, theme, nameKey, name]) => {
      localStorage.setItem(themeKey, theme);
      localStorage.setItem(nameKey, name);
    },
    [THEME_KEY, THEME, PLAYER_NAME_KEY, MY_NAME],
  );
  await page.goto(`${baseUrl}/${SEASON}/${WEEK}/knockouts`);
  await page.getByText("KC @ DEN").waitFor({ timeout: 10000 });

  if (HOVER) {
    await page
      .getByRole("button", { name: /^Game Status for P1 KC @ DEN/ })
      .hover();
  }
}
