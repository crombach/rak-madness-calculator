import { useState } from "react";
import { VictoryRoute } from "../../types/PlayerAnalysis";
import plural from "../../utils/plural";
import Button from "../button/Button";
import { Picks, Section } from "./analysisParts";
import { RouteMondayNight } from "./mondayNight";
// These render elements of the `analysis` block, which `AnalysisSummary` owns and styles.
import "./AnalysisSummary.scss";

/** How many routes stand open, the rest being a click away. */
const ROUTES_SHOWN_AT_FIRST = 4;

/** The alternatives, fewest games first, with the long tail folded away. */
export default function AnalysisRoutes({
  title,
  routes,
  hiddenCount,
  // Off where every route asks the same of the tiebreaker, which the section
  // below then states once rather than on each of them.
  showMondayNight,
}: {
  title: string;
  routes: Array<VictoryRoute>;
  hiddenCount: number;
  showMondayNight: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const folded = routes.length - ROUTES_SHOWN_AT_FIRST;
  const shown = isExpanded ? routes : routes.slice(0, ROUTES_SHOWN_AT_FIRST);
  return (
    <Section title={title}>
      <ol className="analysis__routes">
        {shown.map((route) => (
          <li
            key={route.games.map((game) => game.label).join()}
            className="analysis__route"
          >
            <Picks games={route.games} />
            {showMondayNight && route.mondayNight.kind === "range" && (
              <RouteMondayNight outlook={route.mondayNight} />
            )}
          </li>
        ))}
      </ol>
      {/* Worked out, then left off, so the count is what the reader is missing.
          Held back while there are routes folded away, which are the ones to read
          before hearing what came after them. */}
      {(isExpanded || folded <= 0) && hiddenCount > 0 && (
        <p className="analysis__note --upright">
          {plural(hiddenCount, "other path")} found but not shown.
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
          {isExpanded ? "Show fewer" : `Show ${plural(folded, "more path")}`}
        </Button>
      )}
    </Section>
  );
}
