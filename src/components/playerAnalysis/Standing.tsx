import { PlayerAnalysis } from "../../types/PlayerAnalysis";
import { PlayerScore, RakMadnessScores } from "../../types/RakMadnessScores";
import plural from "../../utils/plural";
import { comparePlayerScoresOnMerit } from "../../utils/scoring/comparePlayerScores";
import weekShape, { WeekShape } from "../../utils/scoring/weekShape";
// The standing is an element of the `analysis` block, which `AnalysisSummary`
// owns and styles.
import "./AnalysisSummary.scss";

/**
 * Everyone the tiers leave tied at the top, which is everyone who won the week.
 * Points alone would not do: two players level on them can still be told apart by
 * the tiebreakers, leaving one winner rather than two.
 */
function winners(players: Array<PlayerScore>): Array<PlayerScore> {
  const [leader] = players;
  return players.filter(
    (player) => comparePlayerScoresOnMerit(leader, player) === 0,
  );
}

/** Whether any pick has an outcome yet, which is when a standing means anything. */
function hasKickedOff(players: Array<PlayerScore>): boolean {
  return players.some((player) =>
    [...player.college, ...player.pro].some(
      (pick) => pick.status === "yes" || pick.status === "no",
    ),
  );
}

/**
 * Where the player picked stands. Nothing here repeats the answer below it: a
 * player who cannot win reads as knocked out and leaves the points to the
 * explanation, and a clinched player reads as the winner outright, games left or
 * not, leaving the body to say only why that holds where some remain.
 */
function headline(
  players: Array<PlayerScore>,
  isOver: boolean,
  chosen: PlayerScore,
  isClinched: boolean,
): { text: string; tone?: "--won" | "--knocked-out" } {
  if (!hasKickedOff(players)) return { text: "No finished games" };
  const [leader] = players;
  if (chosen.status.isKnockedOut)
    return { text: "Knocked out", tone: "--knocked-out" };
  const behind = leader.score.total - chosen.score.total;
  if (behind > 0)
    return { text: `${plural(behind, "point")} behind ${leader.name}` };
  if (!isOver && !isClinched) return { text: "Tied for the lead" };
  const won = winners(players);
  // Level on points and still beaten, which only the tiebreakers can do.
  if (!won.includes(chosen))
    return { text: `Loses the tiebreaker to ${leader.name}` };
  return {
    text: won.length > 1 ? "Tied for the win" : "Winner",
    tone: "--won",
  };
}

/**
 * Where the player picked stands, which the scores already say. Read straight off
 * them, so it is on screen while their routes are still being worked out.
 *
 * `result` is the analysis once it lands, read only for the "clinched" word: this
 * standing and the answer below it are worked out from the same fact, so neither
 * has to guess what the other already said. Trusted only where it answers
 * for the same player named here, since the dialog keeps the last answer on
 * screen while the next one is worked out.
 */
export default function Standing({
  scores,
  player,
  result,
  shape,
}: {
  scores?: RakMadnessScores;
  player?: string;
  result?: PlayerAnalysis;
  /**
   * What is left of the week. Reading it walks every pick of every player, so
   * the summary works it out once and hands it down. Falls back to asking, for
   * a standing rendered on its own.
   */
  shape?: WeekShape;
}) {
  const players = scores?.scores ?? [];
  // The dialog is opened on a player and never lets go of one, so there is no
  // standing to give until the scores holding them arrive.
  const chosen = players.find((it) => it.name === player);
  if (chosen == null) return null;
  // The counts as well as the answer, since the tail says which of the two is
  // holding the week open.
  const week = shape ?? weekShape(players);
  const remaining = week.remaining.length;
  const unscoreable = week.unscoreable.length;
  const isClinched = result?.kind === "clinched" && result.player === player;
  const { text, tone } = headline(players, week.isOver, chosen, isClinched);
  return (
    <p className="analysis__standing">
      {/* Held apart from the tail, which says how much of the week is behind the
          standing rather than what the standing is, so only the standing is
          colored by it. */}
      <span className={`analysis__headline ${tone ?? ""}`}>{text}</span>
      {" · "}
      {remaining > 0
        ? `${plural(remaining, "game")} still to play`
        : unscoreable > 0
          ? `${plural(unscoreable, "game")} could not be scored`
          : "Week complete"}
    </p>
  );
}
