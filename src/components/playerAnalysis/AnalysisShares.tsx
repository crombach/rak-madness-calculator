import { useState } from "react";
import { PickShares } from "../../types/PlayerAnalysis";
import plural from "../../utils/plural";
import Button from "../button/Button";
import { Section } from "./analysisParts";
import { mondayNightPoints } from "./mondayNight";
import "./AnalysisSummary.scss";

/** How many games stand open, the rest being a click away. */
const SHARES_SHOWN_AT_FIRST = 5;

/**
 * A share as a whole percent, held off both ends.
 *
 * Every game here is in some route and in fewer than all of them, so a rounded 0 or
 * 100 would say the opposite of what the row was put in the table to say.
 */
function percentOf(routes: number, total: number): string {
  return `${Math.min(99, Math.max(1, Math.round((routes / total) * 100)))}%`;
}

/**
 * Each game once, against the routes needing it, where there are more routes than a
 * list can show. `SHARES_SHOWN_AT_FIRST` stand open and a button opens the rest.
 */
export default function AnalysisShares({
  conjoined,
  shares,
  // Off where every route asks the same of the tiebreaker, which the section below
  // then states once rather than under this table.
  showMondayNight,
}: {
  conjoined?: boolean;
  shares: PickShares;
  showMondayNight: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const folded = shares.games.length - SHARES_SHOWN_AT_FIRST;
  const shown = isExpanded
    ? shares.games
    : shares.games.slice(0, SHARES_SHOWN_AT_FIRST);
  const points = showMondayNight ? shares.mondayNight : undefined;
  return (
    <Section conjoined={conjoined} title={plural(shares.routeCount, "way")}>
      <table className="analysis__shares">
        <thead>
          <tr>
            <th scope="col">Pick</th>
            <th scope="col">Needed in</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((share) => (
            <tr key={share.label}>
              {/* The game names the row, so a reader hearing the percent hears
                  which pick it belongs to. */}
              <th scope="row">
                <span className="analysis__share-pick">
                  <span className="analysis__pick-label">{share.label}</span>
                  <span className="analysis__pick-team">{share.pick}</span>
                </span>
              </th>
              <td className="analysis__share">
                {percentOf(share.routes, shares.routeCount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* A total is a condition on a route and these rows are not routes, so the
          loosest one any route asks is said under them rather than in a column. */}
      {points && (
        <p className="analysis__note --upright">
          {`${points.scope === "every" ? "Every path also needs" : "Some paths also need"} ${mondayNightPoints(points.points)}.`}
        </p>
      )}
      {folded > 0 && (
        <Button
          className="analysis__more"
          variant="soft"
          size="sm"
          ariaExpanded={isExpanded}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Show fewer" : "Show more"}
        </Button>
      )}
    </Section>
  );
}
