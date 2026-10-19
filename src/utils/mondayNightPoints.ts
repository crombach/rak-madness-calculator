import { MondayNightRange } from "../types/PlayerAnalysis";

/** The totals that win, as a comparison on the scoreboard column's own name. */
export default function mondayNightPoints({
  min,
  max,
}: MondayNightRange): string {
  if (min != null && max != null) {
    return min === max ? `MNF Points = ${min}` : `${min} ≤ MNF Points ≤ ${max}`;
  }
  return min != null ? `MNF Points ≥ ${min}` : `MNF Points ≤ ${max}`;
}
