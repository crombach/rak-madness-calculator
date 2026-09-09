import debugLog from "../debugLog";
import parsePick from "./parsePick";
import findInconsistentSpreadGames from "./validateSpreads";

export const TIEBREAKER_PICK_KEY = "Pts";

export type ParsedPicks = {
  rows: Array<any>;
  collegeKeys: Array<string>;
  proKeys: Array<string>;
  /** Undefined when the sheet has no `Pts` column, so no game decides ties. */
  tiebreakerGameKey?: string;
  collegeMatchups: Array<Set<string>>;
  proMatchups: Array<Set<string>>;
  /**
   * Every column's matchup, by workbook key, so a column can be paired with the
   * game it describes. The two lists above leave out a column nobody picked,
   * which puts them out of step with the keys.
   */
  matchupsByGameKey: Map<string, Set<string>>;
  /** Game key to the disagreement, for the games that cannot be scored. */
  inconsistentSpreadGames: Map<string, string>;
};

/**
 * One buffer to the parse already run on it, so a refresh rescoring the same
 * workbook does not pay for the xlsx parse again. Keyed by the buffer's own
 * identity rather than its bytes. The picks a `RakMadnessScores` was built from
 * never change without a new buffer replacing it. A `WeakMap` rather than a
 * plain one, so a buffer this hook has moved on from can still be collected.
 */
const parsed = new WeakMap<ArrayBuffer, Promise<ParsedPicks>>();

/**
 * `xlsx-js-style` is over half the bundle, and nothing on the first paint needs
 * it, so it is fetched when a workbook actually turns up.
 */
export default function parsePicksWorkbook(
  picksBuffer: ArrayBuffer,
): Promise<ParsedPicks> {
  const cached = parsed.get(picksBuffer);
  if (cached != null) return cached;
  const parsing = parseWorkbook(picksBuffer);
  parsed.set(picksBuffer, parsing);
  return parsing;
}

async function parseWorkbook(picksBuffer: ArrayBuffer): Promise<ParsedPicks> {
  const XLSX = await import("xlsx-js-style");
  const workbook = XLSX.read(picksBuffer, { type: "array" });
  const picksSheet = workbook.Sheets[Object.keys(workbook.Sheets)[0]];
  const rows: Array<any> = XLSX.utils.sheet_to_json(picksSheet);

  // From the header row, not from a player's row. `sheet_to_json` leaves a blank
  // cell out of the object it builds, so a game the first player skipped would go
  // unscored for everyone, and the tiebreaker game would shift a column.
  //
  // Kept only where some row carries the key. A non-text or repeated header
  // names no row property, and an unreachable column is worse than unlisted.
  const [headerRow = []] = XLSX.utils.sheet_to_json<Array<unknown>>(
    picksSheet,
    {
      header: 1,
    },
  );
  const timesSeen = new Map<string, number>();
  const allKeys = headerRow.flatMap((cell) => {
    const label = cell == null ? "" : String(cell);
    if (label === "") return [];
    // A repeated header is suffixed when the row objects are built, so the second
    // `C1` column is reached as `C1_1`. Counting the repeats rebuilds that name.
    const seen = timesSeen.get(label) ?? 0;
    timesSeen.set(label, seen + 1);
    const key = seen === 0 ? label : `${label}_${seen}`;
    return rows.some((row) => key in row) ? [key] : [];
  });
  const collegeKeys = allKeys.filter((key) => key.startsWith("C"));
  const proKeys = allKeys.filter(
    (key) => key.startsWith("P") && key !== TIEBREAKER_PICK_KEY,
  );
  // The tiebreaker game is the last one before the tiebreaker score column.
  const tiebreakerPickIndex = allKeys.indexOf(TIEBREAKER_PICK_KEY);
  const tiebreakerGameKey =
    tiebreakerPickIndex > 0 ? allKeys[tiebreakerPickIndex - 1] : undefined;

  const matchups: { [gameKey: string]: Set<string> } = {};
  rows.forEach((playerRow: any) => {
    const addToMatchups = (key: string) => {
      const { teamAbbreviation } = parsePick(playerRow[key]);
      if (teamAbbreviation == null) return;
      if (!matchups[key]) {
        matchups[key] = new Set<string>();
      }
      matchups[key].add(teamAbbreviation);
    };
    collegeKeys.forEach(addToMatchups);
    proKeys.forEach(addToMatchups);
  });
  const matchupsFor = (keys: Array<string>) =>
    keys.map((key) => matchups[key]).filter((matchup) => matchup != null);
  const collegeMatchups = matchupsFor(collegeKeys);
  const proMatchups = matchupsFor(proKeys);
  debugLog("matchups", { collegeMatchups, proMatchups });

  const inconsistentSpreadGames = findInconsistentSpreadGames(rows, [
    ...collegeKeys,
    ...proKeys,
  ]);
  // Warned about in production, not just in a dev server. It means the workbook
  // needs fixing, and only whoever published it can do that.
  inconsistentSpreadGames.forEach((reason, gameKey) => {
    console.error(`Cannot score game ${gameKey}. ${reason}`);
  });

  return {
    rows,
    collegeKeys,
    proKeys,
    tiebreakerGameKey,
    collegeMatchups,
    proMatchups,
    matchupsByGameKey: new Map(Object.entries(matchups)),
    inconsistentSpreadGames,
  };
}
