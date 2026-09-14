import {
  PlayerAnalysis,
  RemainingPick,
  WaysThrough,
} from "../../types/PlayerAnalysis";
import { MAX_SEARCHED_GAMES } from "../../utils/scoring/getPlayerAnalysis";
import { Message, Picks, Section } from "./analysisParts";
import { MondayNight } from "./mondayNight";
import AnalysisRoutes from "./AnalysisRoutes";
import AnalysisShares from "./AnalysisShares";
// These render elements of the `analysis` block, which `AnalysisSummary` owns and styles.
import "./AnalysisSummary.scss";

type PathsResult = Extract<PlayerAnalysis, { kind: "paths" }>;

/** Whether anything below the lead asks the player for a game. */
function hasGames(ways: WaysThrough): boolean {
  return (
    ways.mustWin.length > 0 ||
    ways.pool != null ||
    ways.shares != null ||
    (ways.routes?.length ?? 0) > 0
  );
}

/**
 * The games both blocks call must-win, which is the games every way to win the week
 * needs. Each block reads its own list against its own ways, so a game every way
 * needs lands in both and would be named under two headings.
 *
 * Empty where there is one block, whose own list already says this.
 */
function sharedMustWin(result: PathsResult): Array<RemainingPick> {
  if (result.outright == null) return [];
  const outright = new Set(result.outright.mustWin.map((game) => game.label));
  return result.mustWin.filter((game) => outright.has(game.label));
}

/** The same ways, less the games a heading above them already named. */
function past(ways: WaysThrough, named: Array<RemainingPick>): WaysThrough {
  if (named.length === 0) return ways;
  const held = new Set(named.map((game) => game.label));
  return {
    ...ways,
    mustWin: ways.mustWin.filter((game) => !held.has(game.label)),
  };
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
          <Picks className="analysis__pool" games={ways.pool.games} />
        </Section>
      )}

      {ways.routes != null && ways.routes.length > 0 && (
        <AnalysisRoutes
          conjoined={hasMustWin || conjoined}
          title="One of"
          routes={ways.routes}
          showMondayNight={showMondayNight}
        />
      )}

      {ways.shares && (
        <AnalysisShares
          conjoined={hasMustWin || conjoined}
          shares={ways.shares}
          showMondayNight={showMondayNight}
        />
      )}
    </>
  );
}

/**
 * That the tiebreaker is out of it, which nothing below says. `MondayNight` draws
 * nothing where the total is not needed, so a reader without this line cannot tell
 * a week taken outright from one the total still decides.
 *
 * Nothing where the total is in play. That the player can win at all is what the
 * standing above and the blocks below say between them.
 */
function Lead({ result }: { result: PathsResult }) {
  if (result.mondayNight?.kind !== "notNeeded") return null;
  return (
    <p className="analysis__line">
      {`${result.player} can win the week outright.`}
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
    result.pool != null ||
    result.shares != null ||
    (result.routes?.length ?? 0) > 0;
  // A settled total says the games above decide the week, which is the opposite of
  // one more thing to do. Only a range is a condition of its own.
  const asksMondayNight = result.mondayNight?.kind === "range";
  // Lifted over both blocks, so each one below names only what it asks for on top
  // of these. Empty where there is one block, which leaves it rendering as before.
  const hoisted = sharedMustWin(result);
  const ways = past(result, hoisted);

  return (
    <>
      <Lead result={result} />

      {/* Every way to win needs these, whichever block a reader goes on to take,
          so they are named over both rather than again inside each. */}
      {hoisted.length > 0 && (
        <Section title="Must win">
          <Picks className="analysis__must-win" games={hoisted} />
        </Section>
      )}

      {/* Over the ways below it, which win the week only once Monday night's
          total falls right. This one asks more games and no total, so it is the
          answer a reader who can reach it stops at.

          Every way under the second line needs the total: the scorer leaves this
          block out unless it drops the ways that win without one. */}
      {result.outright && (
        <>
          <p className="analysis__divider">To win outright:</p>
          <Ways ways={past(result.outright, hoisted)} showMondayNight={false} />
          <p className="analysis__divider">
            To win with MNF Points tiebreaker:
          </p>
        </>
      )}

      <Ways ways={ways} showMondayNight={result.mondayNight == null} />

      {/* A picked player always reads a sentence. This is the one left where the
          games ask nothing and the line above said nothing either. */}
      {!hasGames(result) && result.mondayNight?.kind !== "notNeeded" && (
        <p className="analysis__line">
          No clean path to victory. The MNF Points tiebreaker decides it.
        </p>
      )}

      <MondayNight
        conjoined={
          asksMondayNight && (ways.mustWin.length > 0 || hasWaysThrough)
        }
        outlook={result.mondayNight}
      />
    </>
  );
}
