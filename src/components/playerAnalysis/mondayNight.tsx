import { Fragment } from "react";
import { MondayNightOutlook } from "../../types/PlayerAnalysis";
import { NAMES, Section } from "./analysisParts";
import "./AnalysisSummary.scss";

/** The outlooks worth a sentence: a week won outright says so on its own line. */
type DecidingOutlook = Exclude<MondayNightOutlook, { kind: "notNeeded" }>;

/** The one outlook a route of its own carries, which is a total still to come. */
type MondayNightRange = Extract<MondayNightOutlook, { kind: "range" }>;

/**
 * The totals that win, as a comparison. `term` names the scoreboard column, in
 * full only where nothing beside the line already names it.
 */
function mondayNightPoints(
  { min, max }: MondayNightRange,
  term: string,
): string {
  if (min != null && max != null) {
    return min === max ? `${term} = ${min}` : `${min} ≤ ${term} ≤ ${max}`;
  }
  return min != null ? `${term} ≥ ${min}` : `${term} ≤ ${max}`;
}

function mondayNightSentence(outlook: DecidingOutlook): string {
  if (outlook.kind === "settled") {
    return "MNF Points are already final, so the games above settle it.";
  }
  // The section title over this line is the column's name, so the line itself
  // only has to say which number.
  const points = mondayNightPoints(outlook, "Points");
  return `${points} to beat ${NAMES.format(outlook.rivals)}.`;
}

/**
 * The total a route of its own asks for, set out the way its picks are: what to do
 * in the ink they use, and the words holding it together in their labels' ink.
 */
export function RouteMondayNight({ outlook }: { outlook: MondayNightRange }) {
  return (
    <p className="analysis__line analysis__route-mnf">
      <span className="analysis__pick-label analysis__and">AND</span>
      {/* In full, since the route this closes carries no title naming it. */}
      <span>{mondayNightPoints(outlook, "MNF Points")}</span>
      <span>
        {/* A list rather than a sentence, since the line around it is one too. */}
        <span className="analysis__term">TO BEAT</span>{" "}
        {outlook.rivals.map((name, index) => (
          <Fragment key={name}>
            {index > 0 && <span className="analysis__term">, </span>}
            {name}
          </Fragment>
        ))}
      </span>
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
  return (
    <Section conjoined={conjoined} title="MNF Points">
      <p className="analysis__line">{mondayNightSentence(outlook)}</p>
    </Section>
  );
}
