import { describe, expect, it } from "vitest";
import { fillerRowCount } from "./useFillerRows";

const ROW_HEIGHT = 32;

function count({
  tableHeight,
  fillerHeight = 0,
  tableTop = 100,
  fillToBottom = 800,
  rowHeight = ROW_HEIGHT,
}: {
  tableHeight: number;
  fillerHeight?: number;
  tableTop?: number;
  fillToBottom?: number;
  rowHeight?: number;
}) {
  return fillerRowCount({
    fillToBottom,
    tableTop,
    tableHeight,
    rowHeight,
    fillerHeight,
  });
}

describe("fillerRowCount", () => {
  it("fills the space left below a short table", () => {
    // 700px of room, 300px of table, so 400px spare and 12 whole rows.
    expect(count({ tableHeight: 300 })).toBe(12);
  });

  it("adds nothing to a table that already reaches the bottom", () => {
    expect(count({ tableHeight: 700 })).toBe(0);
  });

  it("adds nothing to a table taller than the viewport", () => {
    expect(count({ tableHeight: 2000 })).toBe(0);
  });

  it("stops at the bottom of the box, which a scrollbar takes height off", () => {
    // The same 800px window with a 17px horizontal scrollbar under the table:
    // 383px spare rather than 400, which is one row fewer.
    expect(count({ tableHeight: 300, fillToBottom: 783 })).toBe(11);
  });

  it("counts the rows it already added as filler, not content", () => {
    // The same table, once padded: 300px of content plus 12 filler rows.
    const padded = 300 + 12 * ROW_HEIGHT;
    expect(count({ tableHeight: padded, fillerHeight: 12 * ROW_HEIGHT })).toBe(
      12,
    );
  });

  it("settles even when a filler row is not exactly one row tall", () => {
    // The height of the rows already added is measured rather than assumed, so
    // subpixel rounding cannot move the answer on a later pass.
    const content = 260;
    const realRowHeight = ROW_HEIGHT + 0.4;
    let current = 0;
    for (let pass = 0; pass < 5; pass++) {
      current = count({
        tableHeight: content + current * realRowHeight,
        fillerHeight: current * realRowHeight,
      });
    }
    expect(current).toBe(13);
  });

  it("fills a whole empty table, which is what the wireframe is", () => {
    expect(count({ tableHeight: 0, tableTop: 0, fillToBottom: 768 })).toBe(24);
  });

  it("uses the narrow-screen row height when that is what was measured", () => {
    expect(count({ tableHeight: 300, rowHeight: 28 })).toBe(14);
  });

  it("asks for nothing when the row height could not be read", () => {
    expect(count({ tableHeight: 300, rowHeight: 0 })).toBe(0);
  });
});
