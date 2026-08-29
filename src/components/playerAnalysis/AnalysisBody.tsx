import { PlayerAnalysis, UncontrolledGame } from "../../types/PlayerAnalysis";
import plural from "../../utils/plural";
import { Message, NAMES, Picks, Section } from "./analysisParts";
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
    // The standing calls a clinched player the winner without saying of what, so
    // this names the week. Only a week still running needs the line under it,
    // since a week with nothing left to play cannot be undone.
    return (
      <Message
        lines={[
          `${result.player} has won ${weekNumber != null ? `week ${weekNumber}` : "the week"}.`,
          isEveryGameSettled
            ? undefined
            : "Nothing still to be played can take it away.",
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
        <AnalysisRoutes
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
