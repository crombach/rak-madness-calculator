import {
  buildPicksWorkbook,
  makeGame,
  registerAppMocks,
} from "../lib/mocks.js";

const SEASON = 2024;
const WEEK = 5;

/** `light` or `dark`. */
const THEME = process.env.SWINGS_THEME ?? "light";

/** Set to hover the first game's game button before the final screenshot. */
const HOVER = process.env.SWINGS_HOVER === "1";

const THEME_KEY = "rak-madness:settings:theme";

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

/** Upcoming, so neither game has been decided yet. */
function events() {
  return {
    events: [
      makeGame("P1EVT", "DEN", "KC", 0, 0, "1"),
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
    ([key, theme]) => localStorage.setItem(key, theme),
    [THEME_KEY, THEME],
  );
  await page.goto(`${baseUrl}/${SEASON}/${WEEK}/swings`);
  await page.getByText("KC @ DEN").waitFor({ timeout: 10000 });

  if (HOVER) {
    await page
      .getByRole("button", { name: "Game Status for P1 KC @ DEN" })
      .hover();
  }
}
