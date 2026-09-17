import {
  buildPicksWorkbook,
  makeGame,
  registerAppMocks,
} from "../lib/mocks.js";

const SEASON = 2024;
const WEEK = 5;

/**
 * Three players over three pro games, built so that P1 going final knocks Bob
 * out and leaves Carol alive. Bob picked both open games the way Alice did, so
 * a point behind her with nothing left to differ on is the end of his week.
 */
const ROWS = [
  { Name: "Alice", P1: "KC", P2: "SF", P3: "MIA" },
  { Name: "Bob", P1: "BUF", P2: "SF", P3: "MIA" },
  { Name: "Carol", P1: "BUF", P2: "DAL", P3: "NYJ" },
];

function events(gameOneFinal) {
  return {
    events: [
      makeGame(
        "P1EVT",
        "KC",
        "BUF",
        gameOneFinal ? 24 : 7,
        gameOneFinal ? 17 : 3,
        gameOneFinal ? "3" : "2",
      ),
      makeGame("P2EVT", "SF", "DAL", 14, 10, "2"),
      makeGame("P3EVT", "MIA", "NYJ", 17, 13, "2"),
    ],
  };
}

/**
 * The wipe a refresh draws, then the navigation that must not draw it again.
 *
 * A refresh settles P1, which knocks Bob out. His name cell wipes from the face
 * he wore in contention to the skull he wears now, and the pick cells wipe to
 * the colors the settled game gave them. The run then leaves for the homepage
 * and comes back, where the changes have expired and no cell flashes.
 */
export default async function run({ page, context, baseUrl }) {
  const state = { gameOneFinal: false };
  await registerAppMocks(context, {
    season: SEASON,
    week: WEEK,
    xlsxBuffer: buildPicksWorkbook(ROWS),
    events: () => events(state.gameOneFinal),
  });

  await page.goto(`${baseUrl}/${SEASON}/${WEEK}/picks`);
  await page.waitForSelector("td.table__pick", { timeout: 20000 });
  await page.waitForTimeout(1200);

  // Read by the refresh below, and by nothing before it.
  state.gameOneFinal = true;
  await page.getByRole("button", { name: "Refresh" }).click();
  await page.waitForTimeout(2500);

  // The homepage and back, which is what replayed the wipe.
  await page.getByRole("button", { name: "Rakulator" }).click();
  await page.waitForTimeout(1500);
  await page.goBack();
  await page.waitForTimeout(2500);
}
