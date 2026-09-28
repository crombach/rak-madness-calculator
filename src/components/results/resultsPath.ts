import { ScoresView } from "../navbar/ScoresNavbar";

export type ResultsPage = ScoresView | "Swing Games";

const SEGMENTS: Record<ResultsPage, string> = {
  Scoreboard: "scoreboard",
  Picks: "picks",
  "Swing Games": "swings",
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
