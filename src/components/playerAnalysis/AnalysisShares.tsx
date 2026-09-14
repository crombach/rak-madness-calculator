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
}: {
  points: NonNullable<PickShares["mondayNight"]>;
}) {
  return (
    <p className="analysis__note --upright">
      {points.isAlways && "Every way needs the MNF Points tiebreaker. "}
      {`${plural(points.routes, "way")} ${points.routes === 1 ? "needs" : "need"} `}
      <MondayNightPoints outlook={points.points} />.
    </p>
  );
}

/**
 * The way out of the tiebreaker, which the table itself cannot show.
 *
 * A list of ways says this by standing in two halves, one asking more games and no
 * total. A share names a game and not a way, so the halves would stand twice over
 * the same games, and the cost of the higher bar is said in a line instead.
 *
 * The line names the bar, never a way to reach it. The cheapest way to win outright
 * need not be the cheapest way through with games added, and the table shows no way
 * for a reader to add them to.
 */
function SharesOutright({ cost }: { cost: number }) {
  return (
    <p className="analysis__note --upright">
      {`The shortest way to win outright needs ${plural(cost, "more correct pick")}.`}
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
      {points && <SharesMondayNight points={points} />}

      {/* Under the totals, which say the tiebreaker is in play. This says what it
          takes to put it out of play, so it reads as the answer to them. */}
      {shares.outrightCost != null && (
        <SharesOutright cost={shares.outrightCost} />
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
