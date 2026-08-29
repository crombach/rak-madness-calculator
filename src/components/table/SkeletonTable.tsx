import { memo } from "react";
import rangeWithPrefix from "../../utils/rangeWithPrefix";
import { ScoresView } from "../navbar/ScoresNavbar";
import TableShell, { PICK_COL_CLASS, PLAYER_COL_CLASS } from "./TableShell";
import "./SkeletonTable.scss";

/**
 * A middling week's shape, week 5's: six college games and thirteen pro. The real
 * numbers come from the picks, which have not been read yet.
 *
 * Only the count is guessed at. Every column is the width `Table.scss` declares for
 * its kind, so the columns the wireframe does draw are the width the real ones will
 * be, and nothing under a column moves when the week lands.
 */
const COLLEGE_COUNT = 6;
const PRO_COUNT = 13;

/**
 * The field a week is usually played by, which runs past sixty. More than most
 * screens show, so the wireframe scrolls the way the table it stands in for will
 * and the bar is already there when the week lands. `TableShell` carries it one row
 * past the bottom of the box on top of this, for the screen tall enough to show
 * sixty rows at once.
 */
const PLAYER_COUNT = 60;

type Column = {
  header: string;
  /** A game's column, which the real table sizes and centers by its own class. */
  isPick?: boolean;
  /** The player column, which is the widest one and sticks to the left edge. */
  isPlayer?: boolean;
};

/** Both views open on these and close on a total. */
const RANK_AND_PLAYER: Array<Column> = [
  { header: "Rank" },
  { header: "Player", isPlayer: true },
];
const TOTAL_SCORE: Column = { header: "Total Score" };

const SCOREBOARD_COLUMNS: Array<Column> = [
  ...RANK_AND_PLAYER,
  { header: "MNF Points Pick" },
  { header: "MNF Points Distance" },
  { header: "College Score" },
  { header: "Pro Score" },
  { header: "Pro Score ATS" },
  TOTAL_SCORE,
];

function leagueColumns(count: number, prefix: string): Array<Column> {
  return rangeWithPrefix(count, prefix).map((header) => ({
    header,
    isPick: true,
  }));
}

const PICKS_COLUMNS: Array<Column> = [
  ...RANK_AND_PLAYER,
  ...leagueColumns(COLLEGE_COUNT, "C"),
  { header: "College Score" },
  ...leagueColumns(PRO_COUNT, "P"),
  { header: "Pro Score" },
  TOTAL_SCORE,
];

/** The class the real table's header cell of that kind carries, and its width with it. */
function headerClass(column: Column): string | undefined {
  if (column.isPlayer) return PLAYER_COL_CLASS;
  return column.isPick ? PICK_COL_CLASS : undefined;
}

/**
 * A wireframe of a results table, for while the real one is being worked out.
 *
 * Shaped like the view it stands in for, down to the width of every column. It holds
 * no rows of its own: `TableShell` fills the window with rows either way, so the
 * wireframe is as tall as the table however many players turn out to have played.
 *
 * Memoized because it is well over a thousand cells and its route re-renders on
 * every flag the week's loading sets, all of them while this is on screen.
 */
function SkeletonTable({ view }: { view: ScoresView }) {
  const columns = view === "Picks" ? PICKS_COLUMNS : SCOREBOARD_COLUMNS;

  return (
    <>
      {/*
        A screen reader has nothing to read out of the wireframe below, hidden
        entirely, so this says what it stands in for instead.
      */}
      <span className="skeleton__status" role="status">
        Loading {view.toLowerCase()} results
      </span>
      {/* The box the sheen sweeps inside, cut to the table by `SkeletonTable.scss`. */}
      <div className="skeleton__sheen">
        <TableShell
          className="--skeleton"
          columnCount={columns.length}
          standInRows={PLAYER_COUNT}
          busy
          ariaHidden
          header={columns.map((column, index) => (
            // The heading itself, hidden, so a header that wraps to two lines is two
            // lines tall here as well.
            <th
              key={index}
              className={headerClass(column)}
              scope="col"
              data-skeleton-text={column.header}
            >
              <span className="skeleton__bar" />
            </th>
          ))}
        />
      </div>
    </>
  );
}

export default memo(SkeletonTable);
