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
const THEME = process.env.SWINGS_THEME ?? "light";

/** Set to hover the first game's game button before the final screenshot. */
const HOVER = process.env.SWINGS_HOVER === "1";

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
 * Two open pro games, neither settled, so both are swings: P1 crowded on one
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

/** P1 live and close enough to swing either way, P2 yet to start. */
function events() {
  return {
    events: [
      makeGame("P1EVT", "DEN", "KC", 7, 6, "2", 3),
      makeGame("P2EVT", "LAR", "SF", 0, 0, "1"),
    ],
  };
}

/** Opens the swing games page, in the given theme, ending on a game's game button hovered if asked. */
export default async function run({ page, context, baseUrl }) {
  await registerAppMocks(context, {
    season: SEASON,
    week: WEEK,
    xlsxBuffer: buildPicksWorkbook(rows()),
    events,
  });

  await page.goto(`${baseUrl}/${SEASON}/${WEEK}/swings`);
  await page.evaluate(
    ([themeKey, theme, nameKey, name, flagKey]) => {
      localStorage.setItem(themeKey, theme);
      localStorage.setItem(nameKey, name);
      localStorage.setItem(flagKey, "on");
    },
    [THEME_KEY, THEME, PLAYER_NAME_KEY, MY_NAME, EXPERIMENTAL_FEATURES_KEY],
  );
  await page.goto(`${baseUrl}/${SEASON}/${WEEK}/swings`);
  await page.getByText("KC @ DEN").waitFor({ timeout: 10000 });

  if (HOVER) {
    await page
      .getByRole("button", { name: /^Game Status for P1 KC @ DEN/ })
      .hover();
  }
}
