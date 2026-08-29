import { RefObject, useCallback, useLayoutEffect, useState } from "react";
import observeResize from "../utils/observeResize";

/** The rows this hook adds, which `TableShell` renders and this measures back. */
export const FILLER_ROW_CLASS = "table__filler-row";

/** Matches `--rak-table-row-height`, for the render before the table is measured. */
const DEFAULT_ROW_HEIGHT = 32;

/**
 * How many empty rows fit below the table's real ones.
 *
 * `fillerHeight` is what the rows this already added take up, measured rather than
 * assumed, so the spare space is worked out from the real content alone. That is
 * what stops it oscillating as the rows it adds change the height it measures. A
 * filler row a fraction of a pixel off `rowHeight` would otherwise move the answer
 * every time it ran.
 */
export function fillerRowCount({
  fillToBottom,
  tableTop,
  tableHeight,
  rowHeight,
  fillerHeight,
}: {
  /** The line in client coordinates the rows are carried down to. */
  fillToBottom: number;
  tableTop: number;
  tableHeight: number;
  rowHeight: number;
  fillerHeight: number;
}): number {
  if (rowHeight <= 0) {
    return 0;
  }
  const contentHeight = tableHeight - fillerHeight;
  const spare = fillToBottom - tableTop - contentHeight;
  return Math.max(Math.floor(spare / rowHeight), 0);
}

function readRowHeight(table: HTMLElement): number {
  const declared = getComputedStyle(table).getPropertyValue(
    "--rak-table-row-height",
  );
  return Number.parseFloat(declared) || DEFAULT_ROW_HEIGHT;
}

/** The box the table scrolls inside, which is not the window. */
function scrollBoxOf(table: HTMLElement): HTMLElement | undefined {
  for (let box = table.parentElement; box != null; box = box.parentElement) {
    const { overflowY } = getComputedStyle(box);
    if (overflowY === "auto" || overflowY === "scroll") return box;
  }
  return undefined;
}

/**
 * How far down the rows are carried: the bottom of that box's client area rather
 * than of the window. A table wide enough to need a horizontal scrollbar has that
 * bar between the two, and filling to the window would leave a strip of it bare.
 */
function fillToY(box: HTMLElement | undefined): number {
  if (box == null) return window.innerHeight;
  return box.getBoundingClientRect().top + box.clientHeight;
}

/**
 * Pads a table out to the bottom of the viewport, so a short one does not leave
 * the page half empty. Measured in a layout effect, so the rows are there before
 * the first paint.
 */
export default function useFillerRows(
  tableRef: RefObject<HTMLTableElement | null>,
): number {
  const [count, setCount] = useState(0);

  const measure = useCallback(() => {
    const table = tableRef.current;
    if (table == null) return;
    const { top, height } = table.getBoundingClientRect();
    const fillerHeight = Array.from(
      table.querySelectorAll<HTMLElement>(`tr.${FILLER_ROW_CLASS}`),
    ).reduce((sum, row) => sum + row.getBoundingClientRect().height, 0);
    setCount(
      fillerRowCount({
        fillToBottom: fillToY(scrollBoxOf(table)),
        tableTop: top,
        tableHeight: height,
        rowHeight: readRowHeight(table),
        fillerHeight,
      }),
    );
  }, [tableRef]);

  useLayoutEffect(() => {
    // The first pass is before the paint, so the rows are there in the frame the
    // table first appears in. Every pass after it waits for a frame.
    measure();
    let frame = 0;
    // A keyboard opening resizes the window over a few hundred milliseconds, and
    // answering every event of that redraws every filler row mid-animation. One
    // pass a frame is as often as the answer can be seen anyway.
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const table = tableRef.current;
    // The table resizes without the window doing so: a view switch, or scores
    // arriving. And a horizontal scrollbar appearing takes height off the box
    // without either the window or the table changing size.
    const unobserve = observeResize(
      [table, table == null ? undefined : scrollBoxOf(table)],
      schedule,
    );
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      unobserve();
      window.removeEventListener("resize", schedule);
    };
  }, [measure, tableRef]);

  return count;
}
