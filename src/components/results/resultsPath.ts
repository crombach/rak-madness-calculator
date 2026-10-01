import SEPARATOR from "../../utils/separator";

/** Every results page, by the label its caption and its nav control read. */
export const RESULTS_PAGE = {
  scoreboard: "Scoreboard",
  picks: "Picks",
  knockouts: "Knockouts",
  games: "Games",
  comparePlayers: "Compare Players",
} as const;

export type ResultsPage = (typeof RESULTS_PAGE)[keyof typeof RESULTS_PAGE];

/** The pages the navbar's view switch picks between, each one a table. */
export type ScoresView =
  typeof RESULTS_PAGE.scoreboard | typeof RESULTS_PAGE.picks;

type PageInfo = {
  /** The URL segment after the week. */
  segment: string;
  /** Shown as a table the navbar's view switch picks between. */
  isTable: boolean;
  /** Reached from the menu alone, so leaving it pushes history rather than replaces. */
  isMenuOnly: boolean;
};

/** Every results page, by its `RESULTS_PAGE` label. */
export const PAGES: Record<ResultsPage, PageInfo> = {
  [RESULTS_PAGE.scoreboard]: {
    segment: "scoreboard",
    isTable: true,
    isMenuOnly: false,
  },
  [RESULTS_PAGE.picks]: {
    segment: "picks",
    isTable: true,
    isMenuOnly: false,
  },
  [RESULTS_PAGE.knockouts]: {
    segment: "knockouts",
    isTable: false,
    isMenuOnly: true,
  },
  [RESULTS_PAGE.games]: {
    segment: "games",
    isTable: false,
    isMenuOnly: true,
  },
  [RESULTS_PAGE.comparePlayers]: {
    segment: "compare",
    isTable: false,
    isMenuOnly: true,
  },
};

/** The page a URL segment names. An unknown segment reads as the scoreboard. */
export function pageForSegment(segment: string | undefined): ResultsPage {
  const found = (Object.keys(PAGES) as Array<ResultsPage>).find(
    (page) => PAGES[page].segment === segment,
  );
  return found ?? RESULTS_PAGE.scoreboard;
}

/** Whether a page is one of the two tables the view switch picks between. */
export function isScoresView(page: ResultsPage): page is ScoresView {
  return PAGES[page].isTable;
}

/** How a week reads as text, as in "2026 Season • Week 3". */
export function weekName(
  season: number | string,
  week: number | string,
): string {
  return `${season} Season${SEPARATOR}Week ${week}`;
}

// `season`/`week` stay optional. A caller with no week selected yet still needs
// the literal `undefined` segment its URL already reads today.
export default function resultsPath(
  season: number | string | undefined,
  week: number | string | undefined,
  page: ResultsPage,
): string {
  return `/${season}/${week}/${PAGES[page].segment}`;
}
