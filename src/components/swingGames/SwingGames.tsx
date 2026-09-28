import { useMemo } from "react";
import { Link } from "react-router";
import { useIsWeekWon } from "../../context/AppDataContext";
import { useShowGameStatus } from "../../context/GameStatusContext";
import { useShowPlayerAnalysis } from "../../context/PlayerAnalysisContext";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import getSwingGames, { SwingGame } from "../../utils/scoring/getSwingGames";
import Button, { buttonClasses } from "../button/Button";
import { InfoIcon } from "../icon/Icon";
import { Message } from "../playerAnalysis/analysisParts";
import resultsPath from "../results/resultsPath";
import "./SwingGames.scss";

function quietLine(count: number): string | undefined {
  if (count === 0) return undefined;
  return count === 1
    ? "The 1 game left is one everyone can afford to miss."
    : `Each of the ${count} games left is one everyone can afford to miss.`;
}

function Game({ game }: { game: SwingGame }) {
  const showGameStatus = useShowGameStatus();
  const showPlayerAnalysis = useShowPlayerAnalysis();

  return (
    <section className="swing-games__group">
      <h3 className="swing-games__title">
        <button
          type="button"
          className="swing-games__game"
          onClick={() => showGameStatus(game.label)}
        >
          {game.name}
          <InfoIcon />
        </button>
      </h3>
      {game.sides.map((side) => (
        <div key={side.team} className="swing-games__side">
          <p className="swing-games__pick">{side.pick}</p>
          <p className="swing-games__out">Out if it misses:</p>
          <ul className="swing-games__players">
            {side.players.map((name) => (
              <li key={name}>
                <Button size="sm" onClick={() => showPlayerAnalysis(name)}>
                  {name}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/** Each open game, with who it knocks out whichever way it falls. */
export default function SwingGames({
  scores,
  season,
  week,
}: {
  scores?: RakMadnessScores;
  season?: string;
  week?: string;
}) {
  const isDecided = useIsWeekWon();
  const swings = useMemo(() => scores && getSwingGames(scores), [scores]);

  if (swings == null) return null;

  if (isDecided) {
    return (
      <div className="swing-games">
        <Message lines={["The week has a winner."]} />
        <Link
          className={buttonClasses({ className: "swing-games__link" })}
          to={resultsPath(season, week, "Scoreboard")}
        >
          See the scoreboard
        </Link>
      </div>
    );
  }

  if (swings.games.length === 0) {
    return (
      <div className="swing-games">
        <Message
          lines={[
            "No game left knocks anyone out on its own.",
            quietLine(swings.quietCount),
          ]}
        />
      </div>
    );
  }

  return (
    <div className="swing-games">
      {swings.games.map((game) => (
        <Game key={game.label} game={game} />
      ))}
    </div>
  );
}
