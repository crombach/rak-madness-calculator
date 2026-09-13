import {
  buildPicksWorkbook,
  makeGame,
  registerAppMocks,
} from "../lib/mocks.js";

const SEASON = 2024;
const WEEK = 5;

const ROWS = [
  {
    Name: "Alice",
    P1: "KC",
    P2: "SF",
    P3: "MIA",
    P4: "GB",
    P5: "BAL",
    P6: "LAC",
  },
  {
    Name: "Bob",
    P1: "BUF",
    P2: "DAL",
    P3: "NYJ",
    P4: "CHI",
    P5: "CIN",
    P6: "DEN",
  },
  {
    Name: "Carol",
    P1: "KC",
    P2: "DAL",
    P3: "MIA",
    P4: "CHI",
    P5: "BAL",
    P6: "LAC",
  },
  {
    Name: "Dave",
    P1: "BUF",
    P2: "SF",
    P3: "NYJ",
    P4: "GB",
    P5: "CIN",
    P6: "LAC",
  },
  {
    Name: "Erin",
    P1: "KC",
    P2: "SF",
    P3: "NYJ",
    P4: "GB",
    P5: "BAL",
    P6: "DEN",
  },
  {
    Name: "Frank",
    P1: "BUF",
    P2: "DAL",
    P3: "MIA",
    P4: "CHI",
    P5: "CIN",
    P6: "LAC",
  },
  {
    Name: "Grace",
    P1: "KC",
    P2: "SF",
    P3: "MIA",
    P4: "",
    P5: "BAL",
    P6: "LAC",
  },
  {
    Name: "Heidi",
    P1: "BUF",
    P2: "DAL",
    P3: "NYJ",
    P4: "CHI",
    P5: "BAL",
    P6: "DEN",
  },
];

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

/**
 * Pans the picks table right across its colored pick columns, twice. The player
 * column stays pinned left and legible both ways.
 *
 * The first pan is the table at rest, which proves
 * `src/components/table/Table.scss`'s `:has(.table__cell-wipe)` scoping keeps an
 * ordinary pick cell's button unpositioned, so it cannot paint over the sticky
 * column.
 *
 * The second pan puts a wipe in every pick cell, which is a cell a refresh
 * changed. Those buttons are positioned to hold the wipe, so they paint in the
 * step the sticky column paints in and come after it in the row. The `z-index`
 * that sheet gives the column while a wipe is on the table is what keeps their
 * text off it.
 */
export default async function run({ page, context, baseUrl }) {
  await registerAppMocks(context, {
    season: SEASON,
    week: WEEK,
    xlsxBuffer: buildPicksWorkbook(ROWS),
    events,
  });

  await page.goto(`${baseUrl}/${SEASON}/${WEEK}/picks`);
  await page.waitForSelector("td.table__pick", { timeout: 20000 });
  await page.waitForTimeout(500);

  const scroller = page.locator(".page__content");
  const maxScroll = await scroller.evaluate(
    (el) => el.scrollWidth - el.clientWidth,
  );

  async function pan() {
    const steps = 24;
    for (let i = 1; i <= steps; i++) {
      const left = Math.round((maxScroll * i) / steps);
      await scroller.evaluate((el, left) => {
        el.scrollLeft = left;
      }, left);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(600);
  }

  await pan();

  // Pin each overlay at its animation's end state, which clips it away. A real
  // wipe holds that while the cell keeps a previous status. The bug is there.
  await scroller.evaluate((el) => {
    el.scrollLeft = 0;
  });
  // Off each button's own document rather than the global one, which this file
  // is linted as Node and does not have.
  await page
    .locator("td.table__pick .table__cell-button")
    .evaluateAll((buttons) => {
      buttons.forEach((button) => {
        const wipe = button.ownerDocument.createElement("span");
        wipe.className = "table__cell-wipe";
        wipe.setAttribute("aria-hidden", "true");
        wipe.style.animation = "none";
        wipe.style.clipPath = "inset(0 0 0 100%)";
        button.appendChild(wipe);
      });
    });
  await page.waitForTimeout(300);

  await pan();
}
