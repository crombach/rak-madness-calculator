import { useEffect, useState } from "react";
import { GameStatus, HomeAway } from "../../types/ESPN";
import { GameSide, LeagueResult } from "../../types/LeagueResult";
import { GameSpread } from "../../types/WeekGame";
import getClasses from "../../utils/getClasses";
import { PossessionIcon } from "../icon/Icon";
import {
  MINUTE_MS,
  countdownText,
  detailText,
  outcomeText,
} from "./gameStatusText";
// The readout is part of the `game-status` block, which `GameStatusSummary.scss` owns.
import "./GameStatusSummary.scss";

/**
 * Joins the two scores, which meet in the middle of the scoreline at every width.
 *
 * A hyphen rather than an en dash, because the readout is what draws it. DSEG7 has
 * no en dash, and its hyphen is the bar across the middle of a cell, which is the
 * one glyph in the face guaranteed to stand level with the digits either side.
 */
const SCORE_DASH = "-";

/**
 * The character DSEG7 draws with every segment of a digit lit. A row of them behind
 * the score is the display's unlit segments, the way a real readout shows the cells
 * it is not currently using. `LogoButton.tsx` does the same for the app name, in the
 * fourteen-segment face that draws letters.
 */
const DSEG7_ALL_SEGMENTS = "8";

const SECOND_MS = 1000;

/**
 * The time now, refreshed every `everyMs` while `ticking`. A poll waiting out a
 * kickoff renders nothing on its own.
 */
function useClock(ticking: boolean, everyMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!ticking) return;
    const timer = window.setInterval(() => setNow(new Date()), everyMs);
    return () => window.clearInterval(timer);
  }, [ticking, everyMs]);
  return now;
}

/** Seconds as `5:40`. */
function minutesAndSeconds(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** What the mark beside a score is called, for anyone who cannot see it. */
const HAS_BALL_LABEL = "Has the ball";

/**
 * Said in place of the down and distance while a game being played has none, and
 * there is no `possession.between` line either.
 *
 * A line either way, rather than one that comes and goes. The game is asked about again
 * every `POLL_MS`, and an answer with no down in it would otherwise take the line away
 * and move the scoreline under it.
 */
const NO_DOWN = "Between plays";

/** Said in place of the down while a game delayed after kickoff has none. */
const PLAY_STOPPED = "Play stopped";

/** Said under the scores of a game delayed before kickoff. */
const KICKOFF_DELAYED = "Kickoff delayed";

/**
 * Said under the scores of a game ESPN postponed or canceled. The line over the scores
 * says which.
 */
const NOT_PLAYED = "Not played";

/** Said in place of a countdown to a kickoff ESPN sent nothing to parse. */
const KICKOFF_UNKNOWN = "Kickoff TBD";

/**
 * How many cells a side's readout is, whatever it is showing. Two, because the room
 * for a second digit is held whether or not there is one, so a score going from 7 to
 * 14 between two polls moves neither the dash nor the sides either side of it.
 */
const SCORE_CELLS = 2;

/** How a side finished, where the game is over and the two did not finish level. */
export type SideOutcome = "scored" | "missed";

/**
 * How a side finished, as the two names the stylesheet's `outcome` mixin colors. Both
 * a score and the name beside it wear them, so the pair is the one hue.
 */
export function outcomeClasses(outcome?: SideOutcome): Record<string, boolean> {
  return {
    "--scored": outcome === "scored",
    "--missed": outcome === "missed",
  };
}

/** Where the game is up to, over the scores. */
function Detail({ result }: { result: LeagueResult }) {
  const text = detailText(result);
  return (
    <p className="game-status__detail">
      {result.halftimeEndsAt != null ? (
        <HalftimeLeft text={text} endsAt={result.halftimeEndsAt} />
      ) : (
        text
      )}
    </p>
  );
}

/**
 * Halftime and what is left of it, ticking. Its own component, so its clock starts
 * when the countdown does rather than when the game was first drawn.
 */
function HalftimeLeft({ text, endsAt }: { text: string; endsAt: Date }) {
  const now = useClock(true, SECOND_MS);
  const left = Math.ceil((endsAt.getTime() - now.getTime()) / SECOND_MS);
  return left > 0 ? `${text} ${minutesAndSeconds(left)}` : text;
}

/**
 * Under the scores is how long until kickoff before the game starts, what the
 * offense is facing, or what is happening between plays, while it is being played,
 * and what the pool made of it once it is over.
 *
 * Who has the ball is left to the marker beside their score.
 */
function Note({
  result,
  spread,
}: {
  result: LeagueResult;
  spread?: GameSpread;
}) {
  const isPregame = result.status === GameStatus.UPCOMING;
  const now = useClock(isPregame, MINUTE_MS);
  if (isPregame) {
    return (
      <p className="game-status__down">
        {countdownText(result.date, now) ?? KICKOFF_UNKNOWN}
      </p>
    );
  }
  if (result.status === GameStatus.FINAL) {
    return (
      <p className="game-status__outcome">{outcomeText(result, spread)}</p>
    );
  }
  // A down belongs to whoever has the ball. At the half and at the end of a quarter
  // ESPN clears the side but leaves the last down standing, and that down is over.
  const { homeAway, downDistanceText } = result.possession;
  const down = homeAway == null ? undefined : downDistanceText;
  if (result.status === GameStatus.LIVE) {
    return (
      <p className="game-status__down">
        {down ?? result.possession.between ?? NO_DOWN}
      </p>
    );
  }
  const stopped =
    result.status !== GameStatus.DELAYED
      ? NOT_PLAYED
      : (result.period ?? 0) > 0
        ? PLAY_STOPPED
        : KICKOFF_DELAYED;
  return <p className="game-status__down">{down ?? stopped}</p>;
}

/**
 * Which side has the ball, pointed at their score.
 *
 * Both sides wear one whatever the game is doing, and every side without the ball
 * wears an unlit one. It holds the room the lit one takes, so neither the ball
 * changing hands, nor a poll that finds nobody with it, nor a game ending moves the
 * scores.
 */
function Marker({ hasBall }: { hasBall: boolean }) {
  return (
    <span
      className={getClasses("game-status__marker", { "--blank": !hasBall })}
      // A role of its own on the lit one, because the shape inside is hidden and a
      // bare `<span>` carries no label into the accessibility tree.
      role={hasBall ? "img" : undefined}
      aria-label={hasBall ? HAS_BALL_LABEL : undefined}
      aria-hidden={hasBall ? undefined : true}
    >
      <PossessionIcon />
    </span>
  );
}

function Score({
  side,
  homeAway,
  hasBall,
  outcome,
}: {
  side: GameSide;
  homeAway: HomeAway;
  hasBall: boolean;
  outcome?: SideOutcome;
}) {
  const points = `${side.score}`;
  return (
    <p
      className={getClasses(
        "game-status__score",
        `--${homeAway}`,
        outcomeClasses(outcome),
      )}
    >
      {/* Held apart from the marker beside it so a number of one digit takes the
          room two do. */}
      <span className="game-status__points">
        {/* Both cells render, lit or not, so a single-figure score shows the unused
            cell, not a zero. Monospaced, the row lands under the number unmeasured. */}
        <span className="game-status__points-ghost" aria-hidden="true">
          {DSEG7_ALL_SEGMENTS.repeat(SCORE_CELLS)}
        </span>
        {points}
      </span>
      <Marker hasBall={hasBall} />
    </p>
  );
}

/**
 * The two scores and, stacked either side of them, where the game is up to and what
 * either the offense or the pool has to say about it.
 *
 * One block rather than three bands across the scoreline, so both lines are read
 * against the numbers they belong to instead of against the dialog's edges.
 */
export default function Scoreline({
  result,
  spread,
  outcomeOf,
}: {
  result: LeagueResult;
  spread?: GameSpread;
  /** How a side finished, which is nothing until the game is over. */
  outcomeOf: (side: GameSide) => SideOutcome | undefined;
}) {
  // Who has the ball is nobody's before kickoff, and a marker left on the winner
  // reads as a game still going.
  const hasBall = (side: HomeAway) =>
    result.status === GameStatus.LIVE && result.possession.homeAway === side;
  return (
    <div className="game-status__center">
      <Detail result={result} />
      <div className="game-status__scores">
        <Score
          side={result.away}
          homeAway={HomeAway.AWAY}
          hasBall={hasBall(HomeAway.AWAY)}
          outcome={outcomeOf(result.away)}
        />
        <span aria-hidden="true" className="game-status__dash">
          {SCORE_DASH}
        </span>
        <Score
          side={result.home}
          homeAway={HomeAway.HOME}
          hasBall={hasBall(HomeAway.HOME)}
          outcome={outcomeOf(result.home)}
        />
      </div>
      {/* Keyed so a game moved to counts down from now, not from its mount. */}
      <Note key={result.id} result={result} spread={spread} />
    </div>
  );
}
