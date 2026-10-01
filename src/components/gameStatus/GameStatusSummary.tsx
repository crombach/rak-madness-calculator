import { ReactNode, RefObject, useLayoutEffect, useRef, useState } from "react";
import { GameStatus, HomeAway } from "../../types/ESPN";
import { GameSide, LeagueResult } from "../../types/LeagueResult";
import { PlayerScore } from "../../types/RakMadnessScores";
import { GameSpread, WeekGame } from "../../types/WeekGame";
import getClasses from "../../utils/getClasses";
import observeResize from "../../utils/observeResize";
import parsePick from "../../utils/scoring/parsePick";
import pickSplit, { PickSplit } from "../../utils/scoring/pickSplit";
import { gamecastUrl, kickoffParts, scoringTeam } from "./gameStatusText";
import Scoreline, { outcomeClasses, SideOutcome } from "./Scoreline";
import useScorelineFit, { MARKS_OFF, SHORT_NAMES } from "./useScorelineFit";
import "./GameStatusSummary.scss";

/** What the link out to ESPN is called, which is what ESPN calls the page. */
const GAMECAST_LABEL = "Gamecast";

/**
 * What each side is called over its name.
 *
 * In a game played at neither side's own ground, nobody is hosting, so both are said
 * to be a team and nothing more. ESPN names a home side for one of them anyway, and
 * the pool scores the line against it, but the label would be wrong.
 *
 * One word, where a label of two would wrap in the room a phone leaves beside a score
 * and take the name below it down a line.
 */
const SIDE_LABEL: Record<"hosted" | "neutral", Record<HomeAway, string>> = {
  hosted: { [HomeAway.AWAY]: "Away", [HomeAway.HOME]: "Home" },
  neutral: { [HomeAway.AWAY]: "Team", [HomeAway.HOME]: "Team" },
};

/** Each side's pool count and its line, over the scoreline. */
const POOL_LABEL = "All Picks";

/** The reader's own pick, ahead of the pool's. */
const MY_PICK_LABEL = "Your Pick";

/** Read out beside the side the reader picked, to a screen reader alone. */
const PICKED_SIDE_LABEL = "Your pick";

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
  isPicked,
}: {
  side: GameSide;
  homeAway: HomeAway;
  /** Says the sides by where they stand instead of by whose ground it is. */
  isNeutralSite: boolean;
  /** Left out where either side has no mark to draw, so neither draws one. */
  logo?: ReactNode;
  outcome?: SideOutcome;
  /** The side the reader's own pick names. */
  isPicked: boolean;
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
            { "--picked": isPicked },
          )}
        >
          {/* The abbreviation on a phone and the name once there is width for it.
              Both are in the page, so neither costs a measurement to choose
              between. Whichever one is drawn is the one read out. The other is
              `display: none`, which takes it out of the accessibility tree as
              well, so hiding either from a reader by hand would leave the side
              with no name at all at the widths that hide the other. */}
          <span className="game-status__name-full">
            <TeamName team={side.team} />
          </span>
          <span className="game-status__name-short">
            {side.team.abbreviation}
          </span>
          {isPicked && (
            <span className="game-status__sr-only">{PICKED_SIDE_LABEL}</span>
          )}
        </span>
        {side.record != null && (
          <span className="game-status__record">{side.record}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Whether the box's last child has wrapped below its first. Read off the layout
 * rather than a width, since what fits turns on the text in both.
 */
function useWraps<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const box = useRef<T>(null);
  const [wraps, setWraps] = useState(false);
  useLayoutEffect(() => {
    const element = box.current;
    if (element == null) return undefined;
    const measure = () => {
      const first = element.firstElementChild as HTMLElement | null;
      const last = element.lastElementChild as HTMLElement | null;
      setWraps(
        first != null && last != null && last.offsetTop > first.offsetTop,
      );
    };
    measure();
    return observeResize([element], measure);
  }, []);
  return [box, wraps];
}

/** The line a side takes, signed: the favorite gives it, the other side gets it. */
function sideLine(spread: GameSpread, team: string): string {
  const points = team === spread.team ? spread.points : -spread.points;
  return points > 0 ? `+${points}` : `${points}`;
}

/** Both marks or neither. One side wearing a logo and the other nothing reads as the
 *  app having lost track of a team. */
function hasLogos(result: LeagueResult): boolean {
  return result.home.team.logoUrl != null && result.away.team.logoUrl != null;
}

/**
 * The game, laid out the same way whether it is the one just fetched or the week's own
 * copy of it standing in until that answer lands.
 *
 * One layout for both is what lets an answer replace the copy in place. A game the week
 * had live carries a down and a link out, one it had finished carries neither, and each
 * of those is read off the game on screen rather than guessed at.
 */
function Game({
  result,
  spread,
  logo,
  gamecastHref,
  myPick,
  split,
}: {
  result: LeagueResult;
  spread?: GameSpread;
  myPick?: string;
  split?: PickSplit;
  /** What a side wears beside its name, or nothing where the marks are dropped. */
  logo?: (side: GameSide) => ReactNode;
  /** ESPN's page for the game. */
  gamecastHref: string;
}) {
  const [scoreline, fit] = useScorelineFit(result.id);
  const [lead, wrapped] = useWraps<HTMLDivElement>();
  // The link rides with the place, not the kickoff, so it holds the strip's end
  // when the halves stack. A game ESPN sent no address for still carries it.
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
  // Both sides where the game is over and nobody scored, a push or tie with no line
  // to beat, since the pool gives everybody the point, so any pick was on a scoring
  // side.
  const outcomeOf = (side: GameSide): SideOutcome | undefined => {
    if (!isOver) return undefined;
    if (scored == null) return "scored";
    return side.team.abbreviation === scored ? "scored" : "missed";
  };
  const pickedTeam =
    myPick != null ? parsePick(myPick).teamAbbreviation : undefined;
  const isPicked = (side: GameSide) =>
    side.team.abbreviation.toUpperCase() === pickedTeam;
  const pickedSide = [result.away, result.home].find(isPicked);
  const sideProps = (side: GameSide) => ({
    side,
    isNeutralSite: result.isNeutralSite,
    logo: fit < MARKS_OFF ? logo?.(side) : undefined,
    outcome: outcomeOf(side),
    isPicked: isPicked(side),
  });
  const sidePicks = (side: GameSide, count?: number) => (
    <span className="game-status__picks-side">
      {count != null && (
        <>
          <span className="game-status__picks-count">{count}</span>
          <span className="game-status__sr-only"> picked</span>{" "}
        </>
      )}
      <span
        className={getClasses(
          "game-status__picks-team",
          outcomeClasses(outcomeOf(side)),
        )}
      >
        {side.team.abbreviation}
        {spread != null && ` ${sideLine(spread, side.team.abbreviation)}`}
      </span>
    </span>
  );
  return (
    <>
      <div
        className={getClasses("game-status__lead", { "--wrapped": wrapped })}
        ref={lead}
      >
        {myPick != null && (
          <p className="game-status__my-pick">
            {MY_PICK_LABEL}:{" "}
            <span
              className={getClasses(
                "game-status__picks-team",
                outcomeClasses(
                  pickedSide != null ? outcomeOf(pickedSide) : undefined,
                ),
              )}
            >
              {myPick}
            </span>
          </p>
        )}
        <p className="game-status__picks">
          {POOL_LABEL}: {sidePicks(result.away, split?.away)},{" "}
          {sidePicks(result.home, split?.home)}
        </p>
      </div>
      <div
        className={getClasses("game-status__scoreline", {
          "--short-names": fit >= SHORT_NAMES,
        })}
        ref={scoreline}
      >
        <Side homeAway={HomeAway.AWAY} {...sideProps(result.away)} />
        <Scoreline result={result} spread={spread} outcomeOf={outcomeOf} />
        <Side homeAway={HomeAway.HOME} {...sideProps(result.home)} />
      </div>
      {/* Under the scoreline rather than over it. The game is what the dialog was
          opened for, and when and where it is played is the footnote. */}
      <div className="game-status__meta">
        <MetaGroup parts={kickoffParts(result.date)} />
        <MetaGroup parts={placeParts} />
      </div>
    </>
  );
}

/**
 * A game the way ESPN's own boxscore says it. Each side out on its own edge, the two
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
  myPick,
  players,
}: {
  game?: WeekGame;
  /** The game as last fetched, where a fresher one than the week's has arrived. */
  result?: LeagueResult;
  /** The reader's own pick on the game, which marks the side it names. */
  myPick?: string;
  /** Everyone in the pool, for how many picked each side. */
  players?: ReadonlyArray<PlayerScore>;
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

  // The game as last fetched, or the week's copy meanwhile. Same game either way, so
  // the copy can only lag on a score or a clock, replaced in place a moment later.
  const shown = result ?? game.result;
  const logos = hasLogos(shown) && logolessId !== shown.id;

  return (
    <div className="game-status">
      <Game
        result={shown}
        spread={game.spread}
        gamecastHref={gamecastUrl(game.league, shown.id)}
        myPick={myPick}
        split={players != null ? pickSplit(players, game, shown) : undefined}
        logo={
          logos
            ? (side) => (
                <img
                  className="game-status__logo"
                  src={side.team.logoUrl as string}
                  // The team's name is beside it, so the mark says nothing a
                  // reader of the page in words is missing.
                  alt=""
                  // `ResultsFrame` has already warmed every logo the week could
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
