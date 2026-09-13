import { useState } from "react";
import { PickShares } from "../../types/PlayerAnalysis";
import plural from "../../utils/plural";
import Button from "../button/Button";
import { Section } from "./analysisParts";
import { MondayNightPoints } from "./mondayNight";
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
 * What the table's ways ask of the tiebreaker, under them.
 *
 * A sentence rather than the `AND` line a route of its own takes. Only some of the
 * ways are held to what it names, and `AND` would read as holding all of them. The
 * totals every way does agree on never reach here, since the block below says those.
 *
 * The sentence names one total, the one the most ways take. Its count against the
 * table's own says the rest of the ways want something else, and a reader cannot act
 * on a list of ranges anyway.
 *
 * A first sentence stands where every way needs a total of some kind. Counts alone
 * leave a reader unable to tell a tiebreaker that always decides from one that only
 * decides the ways it is named on.
 */
function SharesMondayNight({
  points,
  routeCount,
}: {
  points: NonNullable<PickShares["mondayNight"]>;
  routeCount: number;
}) {
  return (
    <p className="analysis__note --upright">
      {points.asking === routeCount &&
        "Every way needs the MNF Points tiebreaker. "}
      {`${plural(points.routes, "way")} ${points.routes === 1 ? "needs" : "need"} `}
      <MondayNightPoints outlook={points.points} />.
    </p>
  );
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
          one the most routes ask for is said under them rather than in a column. */}
      {points && (
        <SharesMondayNight points={points} routeCount={shares.routeCount} />
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
