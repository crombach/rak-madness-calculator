import {
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { GameStatus, HomeAway } from "../../types/ESPN";
import { League } from "../../types/League";
import { GameSide, LeagueResult } from "../../types/LeagueResult";
import { GameSpread, WeekGame } from "../../types/WeekGame";
import getClasses from "../../utils/getClasses";
import marginAgainstSpread from "../../utils/scoring/marginAgainstSpread";
import { PossessionIcon } from "../icon/Icon";
import "./GameStatusSummary.scss";

/** Regulation is four quarters, and anything past them is overtime. */
const REGULATION_PERIODS = 4;

/**
 * Joins the two scores, which meet in the middle of the scoreline at every width.
 *
 * A hyphen rather than an en dash, because the readout is what draws it: DSEG7 has
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
const ALL_SEGMENTS_ON = "8";

/**
 * What a game yet to kick off is doing, said in place of ESPN's own wording.
 *
 * ESPN says a scheduled game as its kickoff, in Eastern time. The strip under the
 * scoreline already says when the game starts, in the reader's own zone, so ESPN's
 * is the same fact twice and in the wrong zone for anyone outside the east.
 */
const PREGAME_DETAIL = "Pregame";

/** What the link out to ESPN is called, which is what ESPN calls the page. */
const GAMECAST_LABEL = "Gamecast";

/**
 * ESPN's own page for the game, where the drive chart and the box score this dialog
 * leaves out are.
 *
 * The league names itself in the path, and the enum already holds the word ESPN uses
 * for it, since the same value addresses the API the week is read from.
 */
function gamecastUrl(league: League, id: string): string {
  return `https://www.espn.com/${league}/game/_/gameId/${id}`;
}

/** What the mark beside a score is called, for anyone who cannot see it. */
const HAS_BALL_LABEL = "Has the ball";

/**
 * What each side is called over its name.
 *
 * Neither side of a game played at neither of their grounds is hosting anybody, so
 * both are said to be a team and nothing more. ESPN names a home side for one of them
 * anyway, and the pool scores the line against it, but the label would be wrong.
 *
 * One word, where a label of two would wrap in the room a phone leaves beside a score
 * and take the name below it down a line.
 */
const SIDE_LABEL: Record<"hosted" | "neutral", Record<HomeAway, string>> = {
  hosted: { [HomeAway.AWAY]: "Away", [HomeAway.HOME]: "Home" },
  neutral: { [HomeAway.AWAY]: "Team", [HomeAway.HOME]: "Team" },
};

/**
 * Said in place of the down and distance while a game being played has none, which is
 * every ball that is not yet dead and every break in the game.
 *
 * A line either way, rather than one that comes and goes: the game is asked about again
 * every `POLL_MS`, and an answer with no down in it would otherwise take the line away
 * and move the scoreline under it.
 */
const NO_DOWN = "Between plays";

/** The pool's own line on the game, which is not always a bookmaker's. */
const SPREAD_LABEL = "Rak Madness Spread";

/** Said in its place for a game the picks put no line on. */
const NO_SPREAD = "NONE";

/**
 * How a game that finished level, or on its number, was scored. Both are a point for
 * everybody: the pool counts a tie as picking the winner, and a margin that lands on
 * the spread as covering it. Said in the word alone, because the scoreline above
 * marks both sides as having scored and would only be repeating itself here.
 */
const TIED = "Tied";
const PUSH = "Push";

/**
 * When the game starts, as its own parts.
 *
 * Split rather than joined, because the stylesheet is what puts a dot between two
 * parts. Written into the strings instead, the dots inside a half would be spaced one
 * way and the dot between the halves another.
 *
 * Both parts are read off the one instant in whatever zone the reader is in, so a
 * late kickoff falls on the day it falls on for them. The zone is named because this
 * is now the only time the dialog shows, and a bare `1:00 PM` beside a game played
 * three zones away reads as ambiguous.
 */
function kickoffParts(date: Date): Array<string> {
  return [
    date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }),
  ];
}

/**
 * One half of the strip under the scoreline, its parts dotted apart.
 *
 * Keyed by where a part sits rather than by what it says, because the parts are a
 * fixed list in a fixed order and one of them is a link rather than a word.
 */
function MetaGroup({ parts }: { parts: Array<ReactNode> }) {
  return (
    <span className="game-status__meta-group">
      {parts.map((part, index) => (
        <span key={index}>{part}</span>
      ))}
    </span>
  );
}

/** `OT` for the first period past regulation, `2OT` for the next, and so on. */
function overtimeLabel(period: number): string {
  const overtime = period - REGULATION_PERIODS;
  return overtime === 1 ? "OT" : `${overtime}OT`;
}

/** How many periods the game has scores for, overtime included. */
function periodsPlayed(result: LeagueResult): number {
  return Math.max(result.away.linescores.length, result.home.linescores.length);
}

/**
 * How the game stands, in the few characters the column between two scores holds.
 *
 * ESPN's own wording runs to `8:42 - 3rd Quarter`, which wraps to three lines there.
 * Said as `Q3 8:42` it fits on one, on a phone and on a desktop alike.
 */
function detailText(result: LeagueResult): string {
  if (result.status === GameStatus.FINAL) {
    return periodsPlayed(result) > REGULATION_PERIODS ? "FT/OT" : "FT";
  }
  if (result.status === GameStatus.UPCOMING) {
    return PREGAME_DETAIL;
  }
  // Postponed, delayed, canceled: a stage the app has no short form for, so ESPN's
  // own word for it stands. Its wording of those carries no kickoff to repeat.
  if (result.status !== GameStatus.LIVE || result.period == null) {
    return result.detailMessage;
  }
  const period =
    result.period <= REGULATION_PERIODS
      ? `Q${result.period}`
      : overtimeLabel(result.period);
  // A clock reading zero is a period that has ended rather than one being played, and
  // saying so adds nothing to the period itself.
  return result.clock != null && !result.clock.startsWith("0:00")
    ? `${period} ${result.clock}`
    : period;
}

/** The other team in the game, which the line is only ever written against one of. */
function opponentOf(result: LeagueResult, team: string): string {
  return (
    [result.home, result.away]
      .map((side) => side.team.abbreviation)
      .find((abbreviation) => abbreviation !== team) ?? team
  );
}

/** How a side finished, where the game is over and the two did not finish level. */
type SideOutcome = "scored" | "missed";

/**
 * Which side a player had to pick to score the point, or nobody where everybody did.
 *
 * Against the line where the picks carried one, since that is what the week is scored
 * on, and on the game itself where they did not. Nobody on a tie or a push, which the
 * pool scores for everybody either way.
 *
 * The same question `getPickResults` asks of a player's own pick, over the same
 * `marginAgainstSpread`, read from the favored side rather than the picked one.
 */
function scoringTeam(
  result: LeagueResult,
  spread?: GameSpread,
): string | undefined {
  if (spread == null) {
    return result.winner.team?.abbreviation;
  }
  // Read from the favored side, which is the side `weekGames` writes the line from.
  const margin = marginAgainstSpread(result, spread.team, spread.points);
  if (margin === 0) {
    return undefined;
  }
  return margin > 0 ? spread.team : opponentOf(result, spread.team);
}

/**
 * What the pool made of the game, said once it is over.
 *
 * Against the spread where the picks carried one, since that is what the week is
 * scored on, and on the game itself where they did not.
 */
function outcomeText(result: LeagueResult, spread?: GameSpread): string {
  const scored = scoringTeam(result, spread);
  if (spread == null) {
    return scored != null ? `${scored} won` : TIED;
  }
  // Past tense, like `won` above it and the two lines below. The game is over by the
  // time any of them is said.
  return scored != null ? `${scored} covered` : PUSH;
}

/**
 * How many cells a side's readout is, whatever it is showing. Two, because the room
 * for a second digit is held whether or not there is one, so a score going from 7 to
 * 14 between two polls moves neither the dash nor the sides either side of it.
 */
const SCORE_CELLS = 2;

/** Where the game is up to, over the scores. */
function Detail({ result }: { result: LeagueResult }) {
  return <p className="game-status__detail">{detailText(result)}</p>;
}

/**
 * Under the scores: what the offense is facing while the game is being played, and
 * what the pool made of it once the game is over.
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
  if (result.status === GameStatus.FINAL) {
    return (
      <p className="game-status__outcome">{outcomeText(result, spread)}</p>
    );
  }
  const { downDistanceText } = result.possession;
  if (downDistanceText == null && result.status !== GameStatus.LIVE) {
    return null;
  }
  return <p className="game-status__down">{downDistanceText ?? NO_DOWN}</p>;
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
  return hasBall ? (
    // A role of its own, because the shape inside is hidden and a bare `<span>`
    // carries no label into the accessibility tree.
    <span
      className="game-status__marker"
      role="img"
      aria-label={HAS_BALL_LABEL}
    >
      <PossessionIcon />
    </span>
  ) : (
    <span aria-hidden="true" className="game-status__marker --blank">
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
      className={getClasses("game-status__score", `--${homeAway}`, {
        "--scored": outcome === "scored",
        "--missed": outcome === "missed",
      })}
    >
      {/* Held apart from the marker beside it so a number of one digit takes the
          room two do. */}
      <span className="game-status__points">
        {/* Both cells, lit or not, so a score in single figures shows the one it is
            not using rather than a zero standing in it. The face is monospaced, so
            the row lands exactly under the number without being measured. */}
        <span className="game-status__points-ghost" aria-hidden="true">
          {ALL_SEGMENTS_ON.repeat(SCORE_CELLS)}
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
function Center({
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
      <Note result={result} spread={spread} />
    </div>
  );
}

/**
 * A team's name in full, where it plays over what it is called there.
 *
 * Two lines rather than one, since that is how a name of four words reads as one
 * thing. ESPN sends both halves for every team in either league, and a team it sent
 * only the whole name for takes the one line it can be split no further than.
 */
function TeamName({ team }: { team: GameSide["team"] }) {
  if (team.location == null || team.mascot == null) {
    return team.name;
  }
  return (
    <>
      <span className="game-status__name-place">{team.location}</span>
      <span className="game-status__name-mascot">{team.mascot}</span>
    </>
  );
}

/** A side's mark and text. Its score is in the block between the two sides. */
function Side({
  side,
  homeAway,
  isNeutralSite,
  logo,
  outcome,
}: {
  side: GameSide;
  homeAway: HomeAway;
  /** Says the sides by where they stand instead of by whose ground it is. */
  isNeutralSite: boolean;
  /** Left out where either side has no mark to draw, so neither draws one. */
  logo?: ReactNode;
  outcome?: SideOutcome;
}) {
  return (
    <div className={`game-status__side --${homeAway}`}>
      {logo}
      <div className="game-status__team">
        <span className="game-status__side-label">
          {SIDE_LABEL[isNeutralSite ? "neutral" : "hosted"][homeAway]}
        </span>
        <span
          className={getClasses("game-status__team-name", {
            "--scored": outcome === "scored",
            "--missed": outcome === "missed",
          })}
        >
          {/* The abbreviation on a phone and the name once there is width for it.
              Both are in the page, so neither costs a measurement to choose
              between. Whichever one is drawn is the one read out: the other is
              `display: none`, which takes it out of the accessibility tree as
              well, so hiding either from a reader by hand would leave the side
              with no name at all at the widths that hide the other. */}
          <span className="game-status__name-full">
            <TeamName team={side.team} />
          </span>
          <span className="game-status__name-short">
            {side.team.abbreviation}
          </span>
        </span>
        {side.record != null && (
          <span className="game-status__record">{side.record}</span>
        )}
      </div>
    </div>
  );
}

/** Both marks or neither: one side wearing a logo and the other nothing reads as the
 *  app having lost track of a team. */
function hasLogos(result: LeagueResult): boolean {
  return result.home.team.logoUrl != null && result.away.team.logoUrl != null;
}

/**
 * The lines either side of the scores, each of which is one word on one line.
 *
 * A word is set on the line whether or not the line is wide enough to hold it, so a
 * name with too little room runs on over the mark beside it rather than wrapping under
 * it. That is what makes a line wider than the box it was given, which is the one
 * question asked of these.
 */
const SIDE_LINES =
  ".game-status__side-label, .game-status__team-name, .game-status__record";

/** Whether anything either side of the scores is wider than the room it was given. */
function isCramped(scoreline: HTMLElement): boolean {
  return Array.from(scoreline.querySelectorAll<HTMLElement>(SIDE_LINES)).some(
    (line) => line.scrollWidth > line.clientWidth,
  );
}

/**
 * How far back a scoreline has been cut to fit, in the order it gives things up. The
 * full names go first, down to the abbreviation ESPN says the game in, which is the
 * same team said shorter. The marks go next, and only once shortening the names was not
 * enough, since a mark says which team this is at a glance and the abbreviation is what
 * a reader has left to go on.
 *
 * Each step leaves the names more room than the one before it, and the last is as
 * narrow as the scoreline goes.
 */
const SHORT_NAMES = 1;
const MARKS_OFF = 2;

/**
 * How much of the scoreline there is room for, measured rather than read off a width.
 *
 * What a side needs is what it is called, and no width tells `CONN` and `BUF` apart:
 * the same phone holds one game's scoreline and breaks the next one's. So the whole
 * thing goes in, the scoreline is measured, and it is cut back a step at a time for as
 * long as a name is still running over the room it was given.
 *
 * Two steps rather than one because a phone names both sides in full nowhere: below
 * `$breakpoint-roomy` the first step is already what is on screen, so it changes nothing
 * and the marks are what has to go.
 *
 * The verdict is held against the game it was reached on and the width it was reached
 * at, rather than as a flag. Either one moving puts the whole scoreline back and asks
 * again: another game is another pair of names, and another width is other room to hold
 * them.
 *
 * @param id the game on screen, which is what the verdict is about.
 */
function useScorelineFit(
  id: string,
): [RefObject<HTMLDivElement | null>, number] {
  const scoreline = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>();
  const [cut, setCut] = useState<{
    id: string;
    width?: number;
    step: number;
  }>();

  const step =
    cut != null && cut.id === id && cut.width === width ? cut.step : 0;

  const measure = useCallback(() => {
    const element = scoreline.current;
    if (element == null || step >= MARKS_OFF) {
      return;
    }
    if (isCramped(element)) {
      setCut({ id, width, step: step + 1 });
    }
  }, [id, step, width]);

  // Every render, since what the scoreline holds is what decides this and a game going
  // final rewrites half of it. Before the browser paints, so a step the scoreline is
  // about to give up is never one the reader saw it holding.
  useLayoutEffect(measure);

  // A name measured in the fallback font was measured at the wrong width, and the swap
  // to Inter is not a thing the page is rendered again for. Asked once more when the
  // font is in, which on a warm cache is straight away. Guarded because jsdom, which
  // has no layout to measure in the first place, has no font set either.
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => {
      if (live) {
        measure();
      }
    });
    return () => {
      live = false;
    };
  }, [measure]);

  // The width alone. Every cut makes the scoreline shorter, and a height this answered
  // would put the question again on the strength of its own answer, forever.
  //
  // Guarded on `ResizeObserver` itself, as `useFillerRows` is, so a runtime without one
  // holds the width it opened at rather than throwing on the way in.
  useEffect(() => {
    const element = scoreline.current;
    if (element == null || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [scoreline, step];
}

/**
 * The game, laid out the same way whether it is the one just fetched or the week's own
 * copy of it standing in until that answer lands.
 *
 * One layout for both is what lets an answer replace the copy in place: a game the week
 * had live carries a down and a link out, one it had finished carries neither, and each
 * of those is read off the game on screen rather than guessed at.
 */
function Game({
  result,
  spread,
  logo,
  gamecastHref,
}: {
  result: LeagueResult;
  spread?: GameSpread;
  /** What a side wears beside its name, or nothing where the marks are dropped. */
  logo?: (side: GameSide) => ReactNode;
  /** ESPN's page for the game. */
  gamecastHref: string;
}) {
  const [scoreline, fit] = useScorelineFit(result.id);
  // The link rides with the place rather than the kickoff, so it ends the strip at
  // every width rather than moving when the two halves stack. Both parts are their
  // own, so a game ESPN sent no address for still carries the link.
  const placeParts = [
    result.venue,
    <a
      // `MetaGroup` keys each part by where it sits, so this one is only here
      // because a bare element in an array literal is a lint error without it.
      key="gamecast"
      className="game-status__gamecast"
      href={gamecastHref}
      target="_blank"
      rel="noreferrer"
    >
      {GAMECAST_LABEL}
    </a>,
  ].filter(Boolean);
  // Only once the game is over, which is when the sentence under the scores says the
  // same thing. A side ahead at half time has won nothing yet.
  const isOver = result.status === GameStatus.FINAL;
  const scored = isOver ? scoringTeam(result, spread) : undefined;
  // Both sides where the game is over and nobody scored, which is a push or a tie
  // with no line to push against. The pool gives everybody the point there, so
  // whichever side a pick was on, it was on a side that scored.
  const outcomeOf = (side: GameSide): SideOutcome | undefined => {
    if (!isOver) return undefined;
    if (scored == null) return "scored";
    return side.team.abbreviation === scored ? "scored" : "missed";
  };
  return (
    <>
      <p className="game-status__spread">
        {SPREAD_LABEL}:{" "}
        <span className="game-status__spread-value">
          {spread != null ? `${spread.team} ${spread.points}` : NO_SPREAD}
        </span>
      </p>
      <div
        className={getClasses("game-status__scoreline", {
          "--short-names": fit >= SHORT_NAMES,
        })}
        ref={scoreline}
      >
        <Side
          side={result.away}
          homeAway={HomeAway.AWAY}
          isNeutralSite={result.isNeutralSite}
          logo={fit < MARKS_OFF ? logo?.(result.away) : undefined}
          outcome={outcomeOf(result.away)}
        />
        <Center result={result} spread={spread} outcomeOf={outcomeOf} />
        <Side
          side={result.home}
          homeAway={HomeAway.HOME}
          isNeutralSite={result.isNeutralSite}
          logo={fit < MARKS_OFF ? logo?.(result.home) : undefined}
          outcome={outcomeOf(result.home)}
        />
      </div>
      {/* Under the scoreline rather than over it: the game is what the dialog was
          opened for, and when and where it is played is the footnote. */}
      <div className="game-status__meta">
        <MetaGroup parts={kickoffParts(result.date)} />
        <MetaGroup parts={placeParts} />
      </div>
    </>
  );
}

/**
 * A game the way ESPN's own boxscore says it: each side out on its own edge, the two
 * scores meeting at a dash between them, with where the game is up to over those scores
 * and what the offense or the pool has to say under them.
 *
 * `result` is the game as it was last fetched. There is none until the first answer
 * lands, and the week's own copy of the same game stands in meanwhile, so the dialog
 * opens on the game rather than on a wait for it.
 */
export default function GameStatusSummary({
  game,
  result,
}: {
  game?: WeekGame;
  /** The game as last fetched, where a fresher one than the week's has arrived. */
  result?: LeagueResult;
}) {
  // Which game's marks failed to load, rather than a flag, so moving to another
  // game asks about its marks instead of inheriting a verdict on the last one's.
  const [logolessId, setLogolessId] = useState<string>();

  if (game == null) {
    return null;
  }
  if (game.result == null) {
    return (
      <p className="game-status__missing">
        No game was found for {game.label}. The picks name {game.name}, which
        ESPN does not list this week.
      </p>
    );
  }

  // The game as last fetched, or the week's own copy until the first answer lands.
  // Both are the same game, so the only thing the week's copy can be behind on is a
  // score or a clock, and a live one is replaced in place a moment later.
  const shown = result ?? game.result;
  const logos = hasLogos(shown) && logolessId !== shown.id;

  return (
    <div className="game-status">
      <Game
        result={shown}
        spread={game.spread}
        gamecastHref={gamecastUrl(game.league, shown.id)}
        logo={
          logos
            ? (side) => (
                <img
                  className="game-status__logo"
                  src={side.team.logoUrl as string}
                  // The team's name is beside it, so the mark says nothing a
                  // reader of the page in words is missing.
                  alt=""
                  // `GameStatusDialog` has already warmed every logo the week could
                  // show, so this is normally a cache hit, and decoding it before
                  // the frame goes up puts the mark on screen with the name beside
                  // it rather than a frame behind it.
                  decoding="sync"
                  onError={() => setLogolessId(shown.id)}
                />
              )
            : undefined
        }
      />
    </div>
  );
}
