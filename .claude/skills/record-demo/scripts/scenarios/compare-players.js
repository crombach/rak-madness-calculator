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
const THEME = process.env.COMPARE_THEME ?? "light";

/** Set to end on the Player 2 list open rather than on the table. */
const OPEN_LIST = process.env.COMPARE_OPEN === "1";

/** Set to add Ann in a third picker. */
const ADD_THIRD = process.env.COMPARE_ADD === "1";

/** Set to end with the dialog still open over the page. */
const KEEP_DIALOG = process.env.COMPARE_DIALOG === "1";

/** Set to end with the table on every game. */
const SHOW_ALL = process.env.COMPARE_ALL === "1";

/** The reader, preset in the Player picker. */
const MY_NAME = "Dee";

/** Long enough to truncate in the player column and in the list. */
const RIVAL = "Bartholomew Montgomery-Smythe";

/** Dee and the rival split on P1, live, and P3, final, and agree on P2 and P4. */
function rows() {
  return [
    { Name: "Ann", P1: "KC -3", P2: "SF -6", P3: "BUF", P4: "MIA +2", Pts: 41 },
    {
      Name: MY_NAME,
      P1: "KC -3",
      P2: "SF -6",
      P3: "BUF",
      P4: "MIA +2",
      Pts: 44,
    },
    {
      Name: RIVAL,
      P1: "DEN +3",
      P2: "SF -6",
      P3: "NYJ",
      P4: "MIA +2",
      Pts: 37,
    },
    {
      Name: "Bob",
      P1: "DEN +3",
      P2: "LAR +6",
      P3: "NYJ",
      P4: "NE -2",
      Pts: 50,
    },
  ];
}

function events() {
  return {
    events: [
      makeGame("P1EVT", "DEN", "KC", 7, 6, "2"),
      makeGame("P2EVT", "LAR", "SF", 0, 0, "1"),
      makeGame("P3EVT", "NYJ", "BUF", 10, 24, "3"),
      makeGame("P4EVT", "NE", "MIA", 0, 0, "1"),
    ],
  };
}

/** Opens the dialog on the reader, then picks the rival unless `COMPARE_OPEN` is set. */
export default async function run({ page, context, baseUrl }) {
  await registerAppMocks(context, {
    season: SEASON,
    week: WEEK,
    xlsxBuffer: buildPicksWorkbook(rows()),
    events,
  });

  const path = `${baseUrl}/${SEASON}/${WEEK}/compare`;
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
  const choose = page.getByRole("button", { name: "Choose players" });
  await choose.waitFor({ timeout: 10000 });
  await choose.click();
  const versus = page.getByRole("combobox", { name: "Player 2" });
  await versus.waitFor({ timeout: 10000 });
  await versus.click();
  if (OPEN_LIST) return;
  await page.getByRole("option", { name: RIVAL }).click();
  if (ADD_THIRD) {
    await page.getByRole("button", { name: "Add player" }).click();
    await page.getByRole("combobox", { name: "Player 3" }).click();
    await page.getByRole("option", { name: "Ann" }).click();
  }
  if (KEEP_DIALOG) return;
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  if (SHOW_ALL) {
    await page.getByRole("button", { name: "All" }).click();
    // The lamp fades over to the new choice.
    await page.waitForTimeout(500);
  }
  await page.getByRole("table").waitFor();
}
