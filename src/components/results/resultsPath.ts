import { ScoresView } from "../navbar/ScoresNavbar";

// `season`/`week` stay optional: a caller with no week selected yet still needs
// the literal `undefined` segment its URL already reads today.
export default function resultsPath(
  season: number | string | undefined,
  week: number | string | undefined,
  view: ScoresView,
): string {
  return `/${season}/${week}/${view.toLowerCase()}`;
}
