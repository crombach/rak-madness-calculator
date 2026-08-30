import {
  buildPicksWorkbook,
  makeGame,
  registerAppMocks,
} from "../lib/mocks.js";

const SEASON = 2024;
const WEEK = 5;

// Far enough past `PULL_TRIGGER_PX` in `src/hooks/usePullToRefresh.ts` that the
// resistance past it is on screen too.
const PULL_DISTANCE_PX = 150;
const PULL_STEPS = 26;

const ROWS = [
  { Name: "Alice", P1: "KC", P2: "SF", P3: "MIA", P4: "GB", P5: "BAL" },
  { Name: "Bob", P1: "BUF", P2: "DAL", P3: "NYJ", P4: "CHI", P5: "CIN" },
  { Name: "Carol", P1: "KC", P2: "DAL", P3: "MIA", P4: "CHI", P5: "BAL" },
  { Name: "Dave", P1: "BUF", P2: "SF", P3: "NYJ", P4: "GB", P5: "CIN" },
  { Name: "Erin", P1: "KC", P2: "SF", P3: "NYJ", P4: "GB", P5: "BAL" },
  { Name: "Frank", P1: "BUF", P2: "DAL", P3: "MIA", P4: "CHI", P5: "CIN" },
  { Name: "Grace", P1: "KC", P2: "SF", P3: "MIA", P4: "", P5: "BAL" },
  { Name: "Heidi", P1: "BUF", P2: "DAL", P3: "NYJ", P4: "CHI", P5: "BAL" },
];

// One game still to play, which is what keeps the week live and the refresh on
// offer at all.
const events = {
  events: [
    makeGame("P1EVT", "KC", "BUF", 7, 3, "2"),
    makeGame("P2EVT", "SF", "DAL", 27, 20, "3"),
    makeGame("P3EVT", "NYJ", "MIA", 16, 20, "3"),
    makeGame("P4EVT", "CHI", "GB", 10, 24, "3"),
    makeGame("P5EVT", "BAL", "CIN", 24, 17, "3"),
  ],
};

/**
 * Drags one finger down the table and lets go.
 *
 * Chrome DevTools Protocol rather than `page.dispatchEvent`, which builds a
 * `Touch` the page can read but the compositor never sees, so `preventDefault`
 * and the scroller do not actually contend. This is a real touch.
 */
async function pull({ page, context, distance, steps }) {
  const cdp = await context.newCDPSession(page);
  const box = await page.locator("main#main").boundingBox();
  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + 40);
  const at = (step) => [{ x, y: Math.round(y + (distance * step) / steps) }];

  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: at(0),
  });
  for (let step = 1; step <= steps; step += 1) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: at(step),
    });
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(250);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

/**
 * Needs `--touch`, without which Chromium reports a mouse and the gesture is off.
 *
 * Pulls down from the top of the scoreboard on a phone-sized touch screen, where
 * the navbar's refresh button is read and not drawn. Shows the puck coming out
 * from under the bar, the table following the finger, the rescore, and the spring
 * back with the toast that says it happened.
 */
export default async function run({ page, context, baseUrl }) {
  await registerAppMocks(context, {
    season: SEASON,
    week: WEEK,
    xlsxBuffer: buildPicksWorkbook(ROWS),
    events: () => events,
  });

  await page.goto(`${baseUrl}/${SEASON}/${WEEK}/scoreboard`);
  await page.waitForSelector("td.table__player-col", { timeout: 20000 });
  await page.waitForTimeout(700);

  await pull({ page, context, distance: PULL_DISTANCE_PX, steps: PULL_STEPS });
  await page.waitForTimeout(2500);
}
