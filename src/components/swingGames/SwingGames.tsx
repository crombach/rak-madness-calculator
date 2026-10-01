import { Accordion } from "@base-ui/react/accordion";
import { useMemo, useRef, useState } from "react";
import { Navigate, useParams } from "react-router";
import { useSwingGames } from "../../context/AppDataContext";
import { useShowGameStatus } from "../../context/GameStatusContext";
import { useShowPlayerAnalysis } from "../../context/PlayerAnalysisContext";
import { isMyPlayer, useSettings } from "../../context/SettingsContext";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import { WeekGame } from "../../types/WeekGame";
import { SwingGame, SwingSide } from "../../utils/scoring/getSwingGames";
import Button from "../button/Button";
import GameMark, {
  PlayerCountMark,
  gameMarkLabel,
} from "../gameStatus/GameMark";
import { ExpandMoreIcon } from "../icon/Icon";
import plural from "../../utils/plural";
import resultsPath, { RESULTS_PAGE } from "../results/resultsPath";
import useGridColumns from "./useGridColumns";
import "./SwingGames.scss";

/** How many rows of names a folded side shows. */
const FOLDED_ROWS = 2;

/** The columns `.swing-games__players` lays out at the narrowest supported width. */
const BASE_COLUMNS = 2;

/** A side's players, the reader first so a fold never hides them. */
function Side({ side }: { side: SwingSide }) {
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
        <span className="swing-games__count">{side.players.length}</span> must
        win <span className="swing-games__pick">{side.pick}</span>
      </h4>
      <ul ref={grid} className="swing-games__players">
        {shown.map((name) => (
          <li key={name}>
            <button
              type="button"
              className={
                isMyPlayer(name, playerName)
                  ? "swing-games__player --mine"
                  : "swing-games__player"
              }
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

function Game({ game, weekGame }: { game: SwingGame; weekGame?: WeekGame }) {
  const showGameStatus = useShowGameStatus();
  const count = game.sides.reduce(
    (total, side) => total + side.players.length,
    0,
  );
  const players = plural(count, "player");
  const gameName = `${game.label} ${game.name}`;
  const status = weekGame?.result?.status;
  const markLabel = weekGame && gameMarkLabel(weekGame, status);

  return (
    <Accordion.Item
      value={game.label}
      className="swing-games__group"
      render={<section />}
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
          <Side key={side.team} side={side} />
        ))}
      </Accordion.Panel>
    </Accordion.Item>
  );
}

/** Each open game, with who it knocks out whichever way it falls. */
export default function SwingGames({ scores }: { scores?: RakMadnessScores }) {
  const { season, week } = useParams();
  const swings = useSwingGames();
  const weekGames = useMemo(
    () => new Map(scores?.games?.map((game) => [game.label, game])),
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
      {swings.games.map((game) => (
        <Game
          key={game.label}
          game={game}
          weekGame={weekGames.get(game.label)}
        />
      ))}
    </Accordion.Root>
  );
}
