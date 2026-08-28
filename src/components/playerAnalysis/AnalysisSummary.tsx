import { Fragment, ReactNode, useState } from "react";
import {
  MondayNightOutlook,
  PlayerAnalysis,
  RemainingPick,
  UncontrolledGame,
  VictoryRoute,
} from "../../types/PlayerAnalysis";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import plural from "../../utils/plural";
import weekShape, { WeekShape } from "../../utils/scoring/weekShape";
import Button from "../button/Button";
import Standing from "./Standing";
import "./AnalysisSummary.scss";

/** How many routes stand open, the rest being a click away. */
const ROUTES_SHOWN_AT_FIRST = 4;

type PathsResult = Extract<PlayerAnalysis, { kind: "paths" }>;

/** The outlooks worth a sentence: a week won outright says so on its own line. */
type DecidingOutlook = Exclude<MondayNightOutlook, { kind: "notNeeded" }>;

/** The one outlook a route of its own carries, which is a total still to come. */
type MondayNightRange = Extract<MondayNightOutlook, { kind: "range" }>;

const NAMES = new Intl.ListFormat("en-US");

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="analysis__section">
      <h3 className="analysis__section-title">{title}</h3>
      {children}
    </section>
  );
}

function Picks({
  games,
  className,
}: {
  games: Array<RemainingPick>;
  className?: string;
}) {
  return (
    <ul
      className={className ? `analysis__picks ${className}` : "analysis__picks"}
    >
      {games.map((game) => (
        <li key={game.label} className="analysis__pick">
          <span className="analysis__pick-label">{game.label}</span>
          <span className="analysis__pick-team">{game.pick}</span>
        </li>
      ))}
    </ul>
  );
}

/** The MNF Points that win, named the way the scoreboard column is. */
function mondayNightPoints({ min, max }: MondayNightRange): string {
  if (min != null && max != null) {
    return min === max ? `MNF Points = ${min}` : `${min} ≤ MNF Points ≤ ${max}`;
  }
  return min != null ? `MNF Points ≥ ${min}` : `MNF Points ≤ ${max}`;
}

function mondayNightSentence(outlook: DecidingOutlook): string {
  if (outlook.kind === "settled") {
    return "MNF Points are already final, so the games above settle it.";
  }
  return `${mondayNightPoints(outlook)} to beat ${NAMES.format(outlook.rivals)}.`;
}

/**
 * The total a route of its own asks for, set out the way its picks are: what to do
 * in the ink they use, and the words holding it together in their labels' ink.
 */
function RouteMondayNight({ outlook }: { outlook: MondayNightRange }) {
  return (
    <p className="analysis__line analysis__route-mnf">
      <span className="analysis__pick-label">AND</span>
      <span>{mondayNightPoints(outlook)}</span>
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

/** Whether anything below the outright line asks the player for a game. */
function hasGames(result: PathsResult): boolean {
  return (
    result.mustWin.length > 0 ||
    result.pool != null ||
    (result.routes?.length ?? 0) > 0
  );
}

/** The fewest games a way through asks for, which the outright line is measured on. */
function fewestWins(result: PathsResult): number {
  // The routes are held fewest games first, so the shortest is the one on top.
  const fromGames =
    result.pool?.choose ?? result.routes?.[0]?.games.length ?? 0;
  return result.mustWin.length + fromGames;
}

/**
 * Winning the week on points alone leads, since it settles the tiebreaker before
 * the reader has to think about it. Where there is no such line the player is
 * named as standing instead, so the sections below never open on their own.
 */
function Lead({ result }: { result: PathsResult }) {
  const outright =
    result.mondayNight?.kind === "notNeeded"
      ? "Takes the week outright, whatever the MNF Points come to."
      : // Only worth saying where it asks more than the routes below already do.
        result.outrightAt != null && result.outrightAt > fewestWins(result)
        ? `Winning ${plural(result.outrightAt, "game")} takes it outright.`
        : null;
  // Nothing below to lead into, and the closing sentence there is the answer.
  if (outright == null && !hasGames(result)) return null;
  return (
    <p className="analysis__line">
      {outright ?? `${result.player} is still live to win the week.`}
      {/* Hands over to the sections under it, which ask for less. */}
      {hasGames(result) &&
        (outright != null ? " Otherwise:" : " What it takes:")}
    </p>
  );
}

function MondayNight({ outlook }: { outlook?: MondayNightOutlook }) {
  if (outlook == null || outlook.kind === "notNeeded") return null;
  return (
    <Section title="MNF Points">
      <p className="analysis__line">{mondayNightSentence(outlook)}</p>
    </Section>
  );
}

function NeedsHelp({ games }: { games: Array<UncontrolledGame> }) {
  if (games.length === 0) return null;
  return (
    <Section title="Out of your hands">
      <ul className="analysis__help">
        {games.map((game) => (
          <li key={game.label} className="analysis__line">
            <span className="analysis__pick-label">{game.label}</span> is blank
            on your sheet, so {NAMES.format(game.needsToMiss)} has to miss.
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** The alternatives, fewest games first, with the long tail folded away. */
function Routes({
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

/** A line absent is one the answer did not call for, so the caller can pass it. */
function Message({ lines }: { lines: Array<string | undefined> }) {
  return (
    <div className="analysis__message">
      {lines
        .filter((line) => line != null)
        .map((line) => (
          <p key={line} className="analysis__line">
            {line}
          </p>
        ))}
    </div>
  );
}

/** What the player has to do, or why there is nothing left to do about it. */
function Body({
  result,
  isOver,
  week,
}: {
  result: PlayerAnalysis;
  isOver?: boolean;
  week?: number;
}) {
  if (result.kind === "knockedOut") {
    // The explanation names who knocked them out and by how much, so it says they
    // cannot win on its own. Only a player without one needs telling.
    return (
      <Message
        lines={[result.explanation ?? `${result.player} cannot win this week.`]}
      />
    );
  }

  if (result.kind === "clinched") {
    // The standing calls a clinched player the winner without saying of what, so
    // this names the week. Only a week still running needs the line under it,
    // since a week with nothing left to play cannot be undone.
    return (
      <Message
        lines={[
          `${result.player} has won ${week != null ? `week ${week}` : "the week"}.`,
          isOver ? undefined : "Nothing still to be played can take it away.",
        ]}
      />
    );
  }

  if (result.kind === "headline") {
    return (
      <>
        <Message
          lines={[
            `${result.player} needs at least ${result.minimumWins} of their ${result.remainingPickCount} remaining picks.`,
            result.needsMondayNight
              ? "That is only enough to draw level, so the MNF Points tiebreaker would still decide it."
              : undefined,
          ]}
        />
        {/* Why there is nothing below it, in the place the paths count theirs. */}
        <p className="analysis__note">
          Detailed paths are worked out once ten games are left.
        </p>
      </>
    );
  }

  return (
    <>
      <Lead result={result} />

      {result.mustWin.length > 0 && (
        <Section title="Must win">
          <Picks className="analysis__must-win" games={result.mustWin} />
        </Section>
      )}

      {result.pool && (
        <Section
          title={`${result.mustWin.length > 0 ? "Then any" : "Any"} ${result.pool.choose} of these`}
        >
          <Picks games={result.pool.games} />
        </Section>
      )}

      {result.routes != null && result.routes.length > 0 && (
        <Routes
          title={result.mustWin.length > 0 ? "Then one of" : "One of"}
          routes={result.routes}
          hiddenCount={result.hiddenRouteCount}
          showMondayNight={result.mondayNight == null}
        />
      )}

      {/* A picked player always reads a sentence. This is the one left where the
          games ask nothing and the line above said nothing either. */}
      {!hasGames(result) && result.mondayNight?.kind !== "notNeeded" && (
        <p className="analysis__line">
          No clean path to victory. The MNF Points tiebreaker decides it.
        </p>
      )}

      <NeedsHelp games={result.needsHelp} />
      <MondayNight outlook={result.mondayNight} />
    </>
  );
}

/**
 * The whole answer to a player: where they stand, then what that leaves them.
 *
 * The standing belongs to this component rather than to the dialog around it,
 * because there is one headline slot and two components rendering it can put two
 * headlines on screen at once.
 */
export default function AnalysisSummary({
  scores,
  player,
  result,
  shape,
  weekNumber,
}: {
  scores?: RakMadnessScores;
  /** The player picked, whose standing heads the answer. */
  player?: string;
  result?: PlayerAnalysis;
  /**
   * What is left of the week, which the "clinched" case reads. Left out, it is
   * worked out here. Read once and handed to both halves, so neither can
   * disagree with the other and the walk behind it runs once.
   */
  shape?: WeekShape;
  /** Which week this is, named by the one line that congratulates a winner. */
  weekNumber?: number;
}) {
  // Nothing under the search until a name is picked, which the placeholder in it
  // already asks for.
  if (player == null && result == null) return null;

  const week = shape ?? weekShape(scores?.scores ?? []);
  return (
    <div className="analysis">
      <Standing scores={scores} player={player} result={result} shape={week} />
      {result != null && (
        <div className="analysis__body">
          <Body result={result} isOver={week.isOver} week={weekNumber} />
        </div>
      )}
    </div>
  );
}
