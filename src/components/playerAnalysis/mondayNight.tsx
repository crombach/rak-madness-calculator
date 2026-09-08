import { MondayNightOutlook } from "../../types/PlayerAnalysis";
import { Section } from "./analysisParts";
import "./AnalysisSummary.scss";

/** The one outlook a route of its own carries, which is a total still to come. */
type MondayNightRange = Extract<MondayNightOutlook, { kind: "range" }>;

/** The totals that win, as a comparison on the scoreboard column's own name. */
function mondayNightPoints({ min, max }: MondayNightRange): string {
  if (min != null && max != null) {
    return min === max ? `MNF Points = ${min}` : `${min} ≤ MNF Points ≤ ${max}`;
  }
  return min != null ? `MNF Points ≥ ${min}` : `MNF Points ≤ ${max}`;
}

/**
 * The total a route of its own asks for, set out the way its picks are: what to do
 * in the ink they use, and the word holding it to them in their labels' ink.
 */
export function RouteMondayNight({ outlook }: { outlook: MondayNightRange }) {
  return (
    <p className="analysis__line analysis__route-mnf">
      <span className="analysis__pick-label analysis__and">AND</span>
      <span>{mondayNightPoints(outlook)}</span>
    </p>
  );
}

export function MondayNight({
  outlook,
  conjoined,
}: {
  outlook?: MondayNightOutlook;
  conjoined?: boolean;
}) {
  if (outlook == null || outlook.kind === "notNeeded") return null;
  if (outlook.kind === "settled") {
    return (
      <Section conjoined={conjoined} title="MNF Points">
        <p className="analysis__line">
          MNF Points are already final, so the games above settle it.
        </p>
      </Section>
    );
  }
  // The totals are the whole of what this block asks for, so the title carries
  // them and there is nothing left to set under it.
  return <Section conjoined={conjoined} title={mondayNightPoints(outlook)} />;
}
