import {
  buildPicksWorkbook,
  makeGame,
  registerAppMocks,
} from "../lib/mocks.js";

const SEASON = 2024;
const WEEK = 5;

const NAMES = [
  "Alice", "Bob", "Carol", "Dave", "Erin", "Frank", "Grace", "Heidi",
  "Ivan", "Judy", "Mallory", "Niaj", "Olivia", "Peggy", "Rupert", "Sybil",
  "Trent", "Victor", "Walter", "Wendy",
];

const PICK_SETS = [
  { P1: "KC", P2: "SF", P3: "MIA", P4: "GB", P5: "BAL", P6: "LAC" },
  { P1: "BUF", P2: "DAL", P3: "NYJ", P4: "CHI", P5: "CIN", P6: "DEN" },
  { P1: "KC", P2: "DAL", P3: "MIA", P4: "CHI", P5: "BAL", P6: "LAC" },
];

const ROWS = Array.from({ length: 60 }, (_, i) => ({
  Name: `${NAMES[i % NAMES.length]} ${Math.floor(i / NAMES.length) + 1}`,
  ...PICK_SETS[i % PICK_SETS.length],
}));

function events() {
  return {
    events: [
      makeGame("P1EVT", "KC", "BUF", 24, 17, "3"),
      makeGame("P2EVT", "SF", "DAL", 27, 20, "3"),
      makeGame("P3EVT", "NYJ", "MIA", 16, 20, "3"),
      makeGame("P4EVT", "CHI", "GB", 10, 24, "3"),
      makeGame("P5EVT", "BAL", "CIN", 24, 17, "3"),
      makeGame("P6EVT", "DEN", "LAC", 13, 27, "3"),
    ],
  };
}

/** Scrolls the scoreboard down, so a screenshot shows whether the header pins. */
export default async function run({ page, context, baseUrl }) {
  await registerAppMocks(context, {
    season: SEASON,
    week: WEEK,
    xlsxBuffer: buildPicksWorkbook(ROWS),
    events,
  });

  await page.goto(`${baseUrl}/${SEASON}/${WEEK}/scoreboard`);
  await page.waitForSelector("td.table__player-col", { timeout: 20000 });
  await page.waitForTimeout(800);

  const scroller = page.locator(".page__content");
  const max = await scroller.evaluate((el) => el.scrollHeight - el.clientHeight);
  console.log("vertical scroll range:", max);
  await scroller.evaluate((el) => {
    el.scrollTop = Math.round((el.scrollHeight - el.clientHeight) / 2);
    el.scrollLeft = el.scrollWidth - el.clientWidth;
  });
  await page.waitForTimeout(800);
}
