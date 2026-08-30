import {
  buildPicksWorkbook,
  makeGame,
  registerAppMocks,
} from "../lib/mocks.js";

const SEASON = 2024;
const WEEK = 5;

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

const events = {
  events: [
    makeGame("P1EVT", "KC", "BUF", 7, 3, "2"),
    makeGame("P2EVT", "SF", "DAL", 27, 20, "3"),
    makeGame("P3EVT", "NYJ", "MIA", 16, 20, "3"),
    makeGame("P4EVT", "CHI", "GB", 10, 24, "3"),
    makeGame("P5EVT", "BAL", "CIN", 24, 17, "3"),
  ],
};

async function pull({ cdp, page, distance, steps }) {
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
 * One candidate close animation, pulled twice: once at its real duration, once
 * with every duration in it multiplied so the curve itself can be read.
 *
 * The candidate is CSS injected over the running app, read from `$CLOSE_CSS` and
 * `$CLOSE_CSS_SLOW`, so every variant runs against one unmodified build. The slow
 * pass stretches the CSS rather than the clock, because the timer that drops
 * `data-pull` is JavaScript and would cut a stretched transition off mid-flight.
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

  const cdp = await context.newCDPSession(page);
  const css = process.env.CLOSE_CSS ?? "";
  if (css) await page.addStyleTag({ content: css });
  await page.waitForTimeout(700);

  await pull({ cdp, page, distance: PULL_DISTANCE_PX, steps: PULL_STEPS });
  await page.waitForTimeout(2000);

  const slow = process.env.CLOSE_CSS_SLOW ?? "";
  if (slow) await page.addStyleTag({ content: slow });
  await page.waitForTimeout(400);

  await pull({ cdp, page, distance: PULL_DISTANCE_PX, steps: PULL_STEPS });
  await page.waitForTimeout(4500);
}
