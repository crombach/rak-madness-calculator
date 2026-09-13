import { useState } from "react";
import { VictoryRoute } from "../../types/PlayerAnalysis";
import Button from "../button/Button";
import { Picks, Section } from "./analysisParts";
import { MondayNightLine } from "./mondayNight";
import "./AnalysisSummary.scss";

/** How many routes stand open, the rest being a click away. */
const ROUTES_SHOWN_AT_FIRST = 3;

/**
 * The alternatives, fewest games first, with the tail folded away.
 *
 * Every route there is, since `getPlayerAnalysis` answers shares instead of a list
 * once there are more routes than this can show whole.
 */
export default function AnalysisRoutes({
  title,
  conjoined,
  routes,
  // Off where every route asks the same of the tiebreaker, which the section
  // below then states once rather than on each of them.
  showMondayNight,
}: {
  title: string;
  conjoined?: boolean;
  routes: Array<VictoryRoute>;
  showMondayNight: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const folded = routes.length - ROUTES_SHOWN_AT_FIRST;
  const shown = isExpanded ? routes : routes.slice(0, ROUTES_SHOWN_AT_FIRST);
  return (
    <Section conjoined={conjoined} title={title}>
      <ol className="analysis__routes">
        {shown.map((route) => (
          <li
            key={route.games.map((game) => game.label).join()}
            className="analysis__route"
          >
            <Picks games={route.games} />
            {showMondayNight && route.mondayNight.kind === "range" && (
              <MondayNightLine outlook={route.mondayNight} />
            )}
          </li>
        ))}
      </ol>
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
