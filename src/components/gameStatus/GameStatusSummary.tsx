import { ReactNode, useState } from "react";
import { GameStatus, HomeAway } from "../../types/ESPN";
import { GameSide, LeagueResult } from "../../types/LeagueResult";
import { GameSpread, WeekGame } from "../../types/WeekGame";
import getClasses from "../../utils/getClasses";
import { gamecastUrl, kickoffParts, scoringTeam } from "./gameStatusText";
import Scoreline, { outcomeClasses, SideOutcome } from "./Scoreline";
import useScorelineFit, { MARKS_OFF, SHORT_NAMES } from "./useScorelineFit";
import "./GameStatusSummary.scss";

/** What the link out to ESPN is called, which is what ESPN calls the page. */
const GAMECAST_LABEL = "Gamecast";

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

/** The pool's own line on the game, which is not always a bookmaker's. */
const SPREAD_LABEL = "Rak Madness Spread";

/** Said in its place for a game the picks put no line on. */
const NO_SPREAD = "NONE";

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
          className={getClasses(
            "game-status__team-name",
            outcomeClasses(outcome),
          )}
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
        <Scoreline result={result} spread={spread} outcomeOf={outcomeOf} />
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
