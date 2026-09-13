import { PlayerAnalysis } from "../../types/PlayerAnalysis";
import plural from "../../utils/plural";
import { MAX_SEARCHED_GAMES } from "../../utils/scoring/getPlayerAnalysis";
import { Message, Picks, Section } from "./analysisParts";
import { MondayNight } from "./mondayNight";
import AnalysisRoutes from "./AnalysisRoutes";
// These render elements of the `analysis` block, which `AnalysisSummary` owns and styles.
import "./AnalysisSummary.scss";

type PathsResult = Extract<PlayerAnalysis, { kind: "paths" }>;

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

/** The words that hand the lead over to the sections under it. */
const TAKES = " What it takes:";

/**
 * Winning the week on points alone leads, since it settles the tiebreaker before
 * the reader has to think about it. Where there is no such line the player is
 * named as standing instead, so the sections below never open on their own.
 *
 * `outrightAt` is the fewest games any one way to take the week outright asks for,
 * not a count that any games of theirs meet, so the line reads as the floor it is.
 * That makes it a condition rather than an outcome, and the handover under it names
 * what the sections below hold instead of standing as the alternative to an event.
 */
function Lead({ result }: { result: PathsResult }) {
  const outright =
    result.mondayNight?.kind === "notNeeded"
      ? {
          line: "Takes the week outright, whatever the MNF Points come to.",
          // Every way through below takes it outright, so they are what it takes.
          handover: TAKES,
        }
      : // Only worth saying where it asks more than the routes below already do.
        result.outrightAt != null && result.outrightAt > fewestWins(result)
        ? {
            line: `${result.player} needs at least ${plural(result.outrightAt, "game win")} to take the week outright.`,
            // Guarded on just above, so the sections below ask strictly fewer.
            handover: " With fewer wins:",
          }
        : null;
  // Nothing below to lead into, and the closing sentence there is the answer.
  if (outright == null && !hasGames(result)) return null;
  return (
    <p className="analysis__line">
      {outright?.line ?? `${result.player} can still win the week.`}
      {hasGames(result) && (outright?.handover ?? TAKES)}
    </p>
  );
}

/** What the player has to do, or why there is nothing left to do about it. */
export default function AnalysisBody({
  result,
  isEveryGameSettled,
  weekNumber,
}: {
  result: PlayerAnalysis;
  isEveryGameSettled?: boolean;
  weekNumber?: number;
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
    // The standing calls a clinched player the winner, not the week, so this names
    // it. Only an open week needs it below, since a finished one can't be undone.
    return (
      <Message
        lines={[
          `${result.player} has won ${weekNumber != null ? `week ${weekNumber}` : "the week"}.`,
          isEveryGameSettled ? undefined : "No other player can surpass them.",
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
              ? "That is only enough to tie, so the MNF Points tiebreaker would still decide it."
              : undefined,
          ]}
        />

        {/* Every must-win game there is, or none. `provenMustWin` holds nothing
            back, and answers empty where it can prove nothing. */}
        {result.mustWin.length > 0 && (
          <Section title="Must win">
            <Picks className="analysis__must-win" games={result.mustWin} />
          </Section>
        )}

        {/* Why there is nothing more below it, in the place the paths count theirs. */}
        <p className="analysis__note">
          {`Detailed analysis is performed once ${MAX_SEARCHED_GAMES} games remain.`}
        </p>
      </>
    );
  }

  const hasMustWin = result.mustWin.length > 0;
  const hasWaysThrough =
    result.pool != null || (result.routes?.length ?? 0) > 0;
  // A settled total says the games above decide the week, which is the opposite of
  // one more thing to do. Only a range is a condition of its own.
  const asksMondayNight = result.mondayNight?.kind === "range";

  // A win needs every block below, and stacked they read as separate facts. So
  // each block that has one above it opens with `AND`. The first never does.
  const isConjoined = {
    waysThrough: hasMustWin,
    mondayNight: asksMondayNight && (hasMustWin || hasWaysThrough),
  };

  return (
    <>
      <Lead result={result} />

      {hasMustWin && (
        <Section title="Must win">
          <Picks className="analysis__must-win" games={result.mustWin} />
        </Section>
      )}

      {result.pool && (
        <Section
          conjoined={isConjoined.waysThrough}
          title={`Any ${result.pool.choose} of`}
        >
          <Picks games={result.pool.games} />
        </Section>
      )}

      {result.routes != null && result.routes.length > 0 && (
        <AnalysisRoutes
          conjoined={isConjoined.waysThrough}
          title="One of"
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

      <MondayNight
        conjoined={isConjoined.mondayNight}
        outlook={result.mondayNight}
      />
    </>
  );
}
