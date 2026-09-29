/** Every results page, by the label its caption and its nav control read. */
export const RESULTS_PAGE = {
  scoreboard: "Scoreboard",
  picks: "Picks",
  swingGames: "Swing Games",
} as const;

export type ResultsPage = (typeof RESULTS_PAGE)[keyof typeof RESULTS_PAGE];

/** The pages the navbar's view switch picks between, each one a table. */
export type ScoresView =
  typeof RESULTS_PAGE.scoreboard | typeof RESULTS_PAGE.picks;

const SEGMENTS: Record<ResultsPage, string> = {
  [RESULTS_PAGE.scoreboard]: "scoreboard",
  [RESULTS_PAGE.picks]: "picks",
  [RESULTS_PAGE.swingGames]: "swings",
};

// `season`/`week` stay optional. A caller with no week selected yet still needs
// the literal `undefined` segment its URL already reads today.
export default function resultsPath(
  season: number | string | undefined,
  week: number | string | undefined,
  page: ResultsPage,
): string {
  return `/${season}/${week}/${SEGMENTS[page]}`;
}
