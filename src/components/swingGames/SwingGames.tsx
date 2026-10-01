import { Accordion } from "@base-ui/react/accordion";
import { ReactNode, useId, useMemo, useRef, useState } from "react";
import { Navigate, useParams } from "react-router";
import { useShowGameStatus } from "../../context/GameStatusContext";
import { useShowPlayerAnalysis } from "../../context/PlayerAnalysisContext";
import { isMyPlayer, useSettings } from "../../context/SettingsContext";
import useLiveWeek from "../../hooks/useLiveWeek";
import { GameStatus } from "../../types/ESPN";
import { League } from "../../types/League";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import { WeekGame } from "../../types/WeekGame";
import getClasses from "../../utils/getClasses";
import { SwingGame, SwingSide } from "../../utils/scoring/getSwingGames";
import { LeagueResults } from "../../utils/scoring/leagueResults";
import { SwingGames as Swings } from "../../utils/scoring/swingGameTypes";
import Button from "../button/Button";
import CountBadge from "../countBadge/CountBadge";
import PickBadge from "../pickBadge/PickBadge";
import GameMark, {
  PlayerCountMark,
  gameMarkLabel,
} from "../gameStatus/GameMark";
import gameSections, {
  LIVE_STATUSES,
  POLLED_LEAGUES,
} from "../games/gameSections";
import SectionTitle from "../games/SectionTitle";
import { ExpandMoreIcon } from "../icon/Icon";
import plural from "../../utils/plural";
import resultsPath, { RESULTS_PAGE } from "../results/resultsPath";
import useGridColumns from "./useGridColumns";
import "./SwingGames.scss";

const FETCHING_LABEL = "Fetching the games";
const MUST_WIN = "must win";
const KNOCKED_OUT = "knocked out on";

/** How many rows of names a folded side shows. */
const FOLDED_ROWS = 2;

/** The columns `.swing-games__players` lays out at the narrowest supported width. */
const BASE_COLUMNS = 2;

/**
 * A side's players, the reader first so a fold never hides them. Each is ruled in
 * the tables' hue for whether they can still win.
 */
function Side({
  side,
  isFinal,
  knockedOut,
}: {
  side: SwingSide;
  isFinal: boolean;
  knockedOut: ReadonlySet<string>;
}) {
  const showPlayerAnalysis = useShowPlayerAnalysis();
  const { playerName } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  const players = useMemo(() => {
    const mine = side.players.filter((name) => isMyPlayer(name, playerName));
    return [...mine, ...side.players.filter((name) => !mine.includes(name))];
  }, [side.players, playerName]);
  const grid = useRef<HTMLUListElement>(null);
  const limit = FOLDED_ROWS * useGridColumns(grid, BASE_COLUMNS);
  const folded = players.length - limit;
  const shown = isExpanded ? players : players.slice(0, limit);

  return (
    <div className="swing-games__side">
      <h4 className="swing-games__must-win">
        <CountBadge>{side.players.length}</CountBadge>{" "}
        {isFinal ? KNOCKED_OUT : MUST_WIN}{" "}
        <PickBadge pick={side.pick} outcome={isFinal ? "missed" : undefined} />
      </h4>
      <ul ref={grid} className="swing-games__players">
        {shown.map((name) => (
          <li key={name}>
            <button
              type="button"
              className={getClasses("swing-games__player", {
                "--mine": isMyPlayer(name, playerName),
                "--knocked-out": knockedOut.has(name),
              })}
              onClick={() => showPlayerAnalysis(name)}
            >
              {name}
            </button>
          </li>
        ))}
      </ul>
      {folded > 0 && (
        <Button
          className="swing-games__more"
          variant="soft"
          size="sm"
          ariaExpanded={isExpanded}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Show Fewer" : "Show More"}
        </Button>
      )}
    </div>
  );
}

function Game({
  game,
  weekGame,
  status,
  knockedOut,
}: {
  game: SwingGame;
  weekGame?: WeekGame;
  /** The freshest status known, which for a polled game is not the scoring pass's. */
  status?: GameStatus;
  knockedOut: ReadonlySet<string>;
}) {
  const showGameStatus = useShowGameStatus();
  const count = game.sides.reduce(
    (total, side) => total + side.players.length,
    0,
  );
  const players = plural(count, "player");
  const gameName = `${game.label} ${game.name}`;
  const markLabel = weekGame && gameMarkLabel(weekGame, status);

  return (
    <Accordion.Item
      value={game.label}
      className="swing-games__group"
      render={<li />}
    >
      <Accordion.Header className="swing-games__title">
        {/* Opens Game Status, as the picks table's own column heading does. A
            sibling of the toggle, never inside it, so each reaches only its own. */}
        <button
          type="button"
          className="swing-games__game"
          aria-label={[`Game Status for ${gameName}`, markLabel]
            .filter((part) => part != null)
            .join(", ")}
          onClick={() => showGameStatus(game.label)}
        >
          <span className="swing-games__game-label">{game.label}</span>{" "}
          <span className="swing-games__game-matchup">{game.name}</span>
        </button>
        {/* The count and the mark sit at the band's end, the mark where All Games
            has it. Inside the toggle, so a tap beside them still folds the game. */}
        <Accordion.Trigger
          className="swing-games__toggle"
          aria-label={[gameName, players, markLabel]
            .filter((part) => part != null)
            .join(", ")}
        >
          <PlayerCountMark count={count} />
          {weekGame && <GameMark game={weekGame} status={status} />}
          <span className="swing-games__chevron">
            <ExpandMoreIcon />
          </span>
        </Accordion.Trigger>
      </Accordion.Header>
      {/* Mounted while folded, so a side shown in full stays so. */}
      <Accordion.Panel keepMounted className="swing-games__panel">
        {game.sides.map((side) => (
          <Side
            key={side.team}
            side={side}
            isFinal={game.isFinal}
            knockedOut={knockedOut}
          />
        ))}
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="swing-games__section" aria-labelledby={id}>
      <SectionTitle id={id} title={title} count={count} />
      <ul className="swing-games__list">{children}</ul>
    </section>
  );
}

/**
 * Each open game, with who it knocks out whichever way it falls, and each final one
 * with who it knocked out, in `gameSections` as All Games has them, polled as All
 * Games is. A game ESPN does not list has no status to read, so it waits under
 * Upcoming until it is final.
 */
export default function SwingGames({
  scores,
  swings,
  onPoll,
  fetchingLeagues,
}: {
  scores?: RakMadnessScores;
  /** Undefined while the scores, or the code that reads them, load. */
  swings?: Swings;
  /** Which leagues have a request in flight, which is what the busy bar says. */
  fetchingLeagues?: ReadonlySet<League>;
  onPoll?: (
    leagues: ReadonlyArray<League>,
  ) => Promise<LeagueResults | undefined>;
}) {
  const { season, week } = useParams();
  const { fetched } = useLiveWeek({
    active: true,
    leagues: POLLED_LEAGUES,
    games: scores?.games,
    onPoll,
    holdForKickoff: false,
  });
  const weekGames = useMemo(
    () => new Map(scores?.games?.map((game) => [game.label, game])),
    [scores],
  );
  const knockedOut = useMemo(
    () =>
      new Set(
        scores?.scores
          .filter((player) => player.status.isKnockedOut)
          .map((player) => player.name),
      ),
    [scores],
  );
  // The folded ones rather than the open ones, so a game a refresh brings in
  // starts open.
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());

  if (swings == null) return null;
  // A won week, or one no single game decides, has nothing to show here.
  if (swings.games.length === 0) {
    return (
      <Navigate
        replace
        to={resultsPath(season, week, RESULTS_PAGE.scoreboard)}
      />
    );
  }

  const sections = gameSections(
    swings.games.map((game) => {
      const weekGame = weekGames.get(game.label);
      const result =
        weekGame?.result &&
        (fetched?.get(weekGame.result.id) ?? weekGame.result);
      return {
        card: { game, weekGame, status: result?.status },
        status:
          result?.status ??
          (game.isFinal ? GameStatus.FINAL : GameStatus.UPCOMING),
        kickoff: result?.date,
      };
    }),
    new Date(),
  );
  const isFetching = sections.some(({ cards }) =>
    cards.some(
      ({ weekGame, status }) =>
        status != null &&
        LIVE_STATUSES.has(status) &&
        weekGame != null &&
        fetchingLeagues?.has(weekGame.league),
    ),
  );
  const labels = swings.games.map((game) => game.label);
  return (
    <Accordion.Root
      className="swing-games"
      multiple
      value={labels.filter((label) => !closed.has(label))}
      onValueChange={(open: Array<string>) =>
        setClosed(new Set(labels.filter((label) => !open.includes(label))))
      }
    >
      {isFetching && (
        <span
          className="swing-games__progress --live"
          role="progressbar"
          aria-busy="true"
          aria-label={FETCHING_LABEL}
        />
      )}
      {sections.map(({ title, cards }) => (
        <Section key={title} title={title} count={cards.length}>
          {cards.map(({ game, weekGame, status }) => (
            <Game
              key={game.label}
              game={game}
              weekGame={weekGame}
              status={status}
              knockedOut={knockedOut}
            />
          ))}
        </Section>
      ))}
    </Accordion.Root>
  );
}
