import { Accordion } from "@base-ui/react/accordion";
import { useMemo, useRef, useState } from "react";
import { useShowGameStatus } from "../../context/GameStatusContext";
import { useShowPlayerAnalysis } from "../../context/PlayerAnalysisContext";
import { isMyPlayer, useSettings } from "../../context/SettingsContext";
import { GameStatus } from "../../types/ESPN";
import { WeekGame } from "../../types/WeekGame";
import getClasses from "../../utils/getClasses";
import plural from "../../utils/plural";
import { SwingGame, SwingSide } from "../../utils/scoring/swingGameTypes";
import Button from "../button/Button";
import CountBadge from "../countBadge/CountBadge";
import GameMark, {
  PlayerCountMark,
  gameMarkLabel,
} from "../gameStatus/GameMark";
import { ExpandMoreIcon } from "../icon/Icon";
import PickBadge from "../pickBadge/PickBadge";
import useGridColumns from "./useGridColumns";
import "./SwingGames.scss";

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

/** One swing game as a card: its band, then a side per team it knocks out. */
export default function SwingGameCard({
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
