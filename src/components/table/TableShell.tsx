import { ReactNode, useRef } from "react";
import useFillerRows, { FILLER_ROW_CLASS } from "../../hooks/useFillerRows";
import "./Table.scss";

/** The sticky player column's class, which `Table.scss` also sizes and pins. */
export const PLAYER_COL_CLASS = "table__player-col";
/** A game column's class, which `Table.scss` also sizes. */
export const PICK_COL_CLASS = "table__pick-col";

/**
 * The frame both results tables share.
 *
 * Filler rows carry the table down to the bottom of the viewport when the real
 * rows do not reach it, so a short week does not leave the page half empty. The
 * trailing row keeps the last row clear of a phone's rounded corners and home
 * indicator. `Table.scss` sizes it from the safe area, so on a screen without one
 * it has no height at all.
 */
export default function TableShell({
  caption,
  columnCount,
  header,
  className = "",
  busy = false,
  ariaHidden = false,
  standInRows = 0,
  children,
}: {
  /** What the table shows, read by a screen reader alone: visually hidden. */
  caption?: ReactNode;
  columnCount: number;
  header: ReactNode;
  className?: string;
  /** Set while the real rows have not arrived yet. */
  busy?: boolean;
  /**
   * Set on the wireframe, which has nothing real to read out and would otherwise
   * cost a screen reader ~1500 empty cells.
   */
  ariaHidden?: boolean;
  /**
   * The field a table with no real rows of its own stands in for.
   *
   * Set, the filler runs to whichever is the more of this and one row past the
   * bottom of the box. Filling to the bottom alone leaves a table exactly as tall
   * as the box, which is one row short of scrolling, so on a tall enough screen a
   * stand-in for a table that scrolls would not. The count matters as well as the
   * overflow: it is what sets how far the bar thinks it has to go.
   *
   * Left unset, the filler only makes up what the real rows do not reach.
   */
  standInRows?: number;
  children?: ReactNode;
}) {
  const tableRef = useRef<HTMLTableElement>(null);
  const measuredRows = useFillerRows(tableRef);
  const fillerRows =
    standInRows > 0 ? Math.max(measuredRows + 1, standInRows) : measuredRows;

  return (
    <table
      ref={tableRef}
      className={`table ${className}`}
      cellSpacing="0"
      aria-busy={busy || undefined}
      aria-hidden={ariaHidden || undefined}
    >
      {caption != null && (
        <caption className="table__caption">{caption}</caption>
      )}
      <thead className="table__header">
        <tr>{header}</tr>
      </thead>
      <tbody>
        {children}
        {Array.from({ length: fillerRows }, (_, row) => (
          <tr key={`filler-${row}`} className={FILLER_ROW_CLASS}>
            {Array.from({ length: columnCount }, (_, column) => (
              <td key={column} />
            ))}
          </tr>
        ))}
        <tr className="table__last-row">
          <td colSpan={columnCount} />
        </tr>
      </tbody>
    </table>
  );
}

export function RankCell({ rank }: { rank: number }) {
  return (
    <td>
      <b>{rank}</b>
    </td>
  );
}
