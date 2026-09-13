import { PlayerAnalysis, WaysThrough } from "../../types/PlayerAnalysis";
import { MAX_SEARCHED_GAMES } from "../../utils/scoring/getPlayerAnalysis";
import { Message, Picks, Section } from "./analysisParts";
import { MondayNight } from "./mondayNight";
import AnalysisRoutes from "./AnalysisRoutes";
// These render elements of the `analysis` block, which `AnalysisSummary` owns and styles.
import "./AnalysisSummary.scss";

type PathsResult = Extract<PlayerAnalysis, { kind: "paths" }>;

/** Whether anything below the lead asks the player for a game. */
function hasGames(ways: WaysThrough): boolean {
  return (
    ways.mustWin.length > 0 ||
    ways.pool != null ||
    (ways.routes?.length ?? 0) > 0
  );
}

/** The fewest games a way through asks for, which the outright block is measured on. */
function fewestWins(ways: WaysThrough): number {
  // The routes are held fewest games first, so the shortest is the one on top.
  const fromGames = ways.pool?.choose ?? ways.routes?.[0]?.games.length ?? 0;
  return ways.mustWin.length + fromGames;
}

/**
 * What a set of ways through asks for: the games every one of them needs, then the
 * choice left over. Rendered for the ways to win the week and again for the ways to
 * take it outright, which is the same question asked of a higher bar.
 *
 * Each block that has one above it opens with `AND`, since stacked they read as
 * separate facts rather than as one condition. The first never does.
 */
function Ways({
  ways,
  // Off where every route ends the same way, which the section below then states
  // once rather than on each of them.
  showMondayNight,
  conjoined,
}: {
  ways: WaysThrough;
  showMondayNight: boolean;
  conjoined?: boolean;
}) {
  const hasMustWin = ways.mustWin.length > 0;
  return (
    <>
      {/* Every must-win game there is, or none. */}
      {hasMustWin && (
        <Section conjoined={conjoined} title="Must win">
          <Picks className="analysis__must-win" games={ways.mustWin} />
        </Section>
      )}

      {ways.pool && (
        <Section
          conjoined={hasMustWin || conjoined}
          title={`Any ${ways.pool.choose} of`}
        >
          <Picks games={ways.pool.games} />
        </Section>
      )}

      {ways.routes != null && ways.routes.length > 0 && (
        <AnalysisRoutes
          conjoined={hasMustWin || conjoined}
          title="One of"
          routes={ways.routes}
          hiddenCount={ways.hiddenRouteCount}
          showMondayNight={showMondayNight}
        />
      )}
    </>
  );
}

/**
 * Winning the week on points alone leads, since it settles the tiebreaker before
 * the reader has to think about it. Where there is no such line the player is
 * named as standing instead, so the sections below never open on their own.
 */
function Lead({
  result,
  // Off where the outright block follows, since each of the two blocks under it
  // names what it takes on its own line.
  saysWhatItTakes,
}: {
  result: PathsResult;
  saysWhatItTakes: boolean;
}) {
  const takesItOutright = result.mondayNight?.kind === "notNeeded";
  // Nothing below to lead into, and the closing sentence there is the answer.
  if (!takesItOutright && !hasGames(result)) return null;
  return (
    <p className="analysis__line">
      {takesItOutright
        ? "Takes the week outright."
        : `${result.player} can win the week.`}
      {saysWhatItTakes && hasGames(result) && " What it takes:"}
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
        {/* Every must-win game there is, or none. `provenMustWin` holds nothing
            back, and answers empty where it can prove nothing.

            A count of wins is all the rest of the week reduces to up here, and a
            count is not a scenario: it says nothing about which games make it, so
            a reader cannot act on it. Only the games are said, and the note below
            says when the rest arrives. */}
        {result.mustWin.length > 0 && (
          <Section title="Must win">
            <Picks className="analysis__must-win" games={result.mustWin} />
          </Section>
        )}

        {/* Why there is nothing more above it, in the place the paths count theirs. */}
        <p className="analysis__note">
          {`Detailed analysis is performed once ${MAX_SEARCHED_GAMES} games remain.`}
        </p>
      </>
    );
  }

  const hasWaysThrough =
    result.pool != null || (result.routes?.length ?? 0) > 0;
  // A settled total says the games above decide the week, which is the opposite of
  // one more thing to do. Only a range is a condition of its own.
  const asksMondayNight = result.mondayNight?.kind === "range";
  // Only worth a block of its own where it asks more than winning the week does.
  // Asking the same, the blocks above already are the ways to take it outright.
  const outright =
    result.outright != null && fewestWins(result.outright) > fewestWins(result)
      ? result.outright
      : undefined;

  return (
    <>
      <Lead result={result} saysWhatItTakes={outright == null} />

      {/* Over the ways below it, which win the week only once Monday night's
          total falls right. This one asks more games and no total, so it is the
          answer a reader who can reach it stops at. */}
      {outright && (
        <>
          <p className="analysis__line">To win the week outright:</p>
          <Ways ways={outright} showMondayNight={false} />
          <p className="analysis__line">Otherwise:</p>
        </>
      )}

      <Ways ways={result} showMondayNight={result.mondayNight == null} />

      {/* A picked player always reads a sentence. This is the one left where the
          games ask nothing and the line above said nothing either. */}
      {!hasGames(result) && result.mondayNight?.kind !== "notNeeded" && (
        <p className="analysis__line">
          No clean path to victory. The MNF Points tiebreaker decides it.
        </p>
      )}

      <MondayNight
        conjoined={
          asksMondayNight && (result.mustWin.length > 0 || hasWaysThrough)
        }
        outlook={result.mondayNight}
      />
    </>
  );
}
