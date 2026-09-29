import { useMemo, useState } from "react";
import useArrival from "../../hooks/useArrival";
import useLiveGame from "../../hooks/useLiveGame";
import useMyPick from "../../hooks/useMyPick";
import { GameStatus } from "../../types/ESPN";
import { League } from "../../types/League";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import { WeekGame } from "../../types/WeekGame";
import matching from "../../utils/matching";
import { LeagueResults } from "../../utils/scoring/leagueResults";
import DialogCombobox from "../dialog/DialogCombobox";
import DialogShell from "../dialog/DialogShell";
import GameMark from "./GameMark";
import GameStatusSummary from "./GameStatusSummary";
import "./GameStatusDialog.scss";

/**
 * The column and the matchup together. The input reads it back once a game is
 * chosen, and a query is matched against it, so the input's own text always finds
 * its game.
 */
export function gameSearchText(game: WeekGame): string {
  return `${game.label} ${game.name}`;
}

function GameName({ game }: { game: WeekGame }) {
  return (
    <>
      <span className="game-status__option-label">{game.label}</span>
      <span className="game-status__option-name">{game.name}</span>
    </>
  );
}

/**
 * How a game in the week on screen is going, opened from a pick cell in the picks
 * table.
 *
 * The week's own copy of the game is on screen the moment the dialog opens. A game
 * that has not finished is fetched again as it appears and every twenty seconds after
 * that, and each answer replaces the score in place, so a live game catches up rather
 * than making the reader wait. One already final is never fetched, because the week
 * scored it at the only score it can have.
 */
export default function GameStatusDialog({
  open,
  onOpenChange,
  gameLabel: named,
  scores,
  fetchingLeagues,
  onPoll,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The column the dialog was opened on, by clicking one of its cells. */
  gameLabel?: string;
  scores?: RakMadnessScores;
  /** Which leagues have a request in flight, which is what the busy bar says. */
  fetchingLeagues?: ReadonlySet<League>;
  /**
   * Fetches the league of the game shown here, and rescores the week where anything
   * in that league moved. The picks table's column marks then say that a game is
   * being played, has stopped or is over, and its `.table__cell-wipe` animations
   * play for whatever the move changed, instead of waiting for a manual refresh.
   */
  onPoll?: (
    leagues: ReadonlyArray<League>,
  ) => Promise<LeagueResults | undefined>;
}) {
  const [chosen, setChosen] = useState<string>();
  const [query, setQuery] = useState("");

  // Held still between renders, since the combobox reads the chosen game back off
  // this list by identity.
  const games = useMemo(() => scores?.games ?? [], [scores]);

  // The choice is kept as the column, and the game read back off the list on every
  // render, so a rescore that replaces every game carries it forward. Keeping the
  // object instead would leave the dialog on the pass the reader opened, which
  // still has the game live after the rescore that going final set off.
  const game = useMemo(
    () => games.find((it) => it.label === chosen),
    [games, chosen],
  );

  // A column arriving from outside stands in for a choice made in the search.
  useArrival(named, (label) => {
    setChosen(label);
    const found = games.find((it) => it.label === label);
    setQuery(found != null ? gameSearchText(found) : label);
  });

  const { shown } = useLiveGame({
    open,
    game,
    games: scores?.games,
    onPoll,
  });
  const myPick = useMyPick(scores, game);

  // A game the week already has final is never fetched, so a fetch running on
  // behalf of the week's other columns draws nothing over it.
  const isGameLoading =
    game?.result != null &&
    game.result.status !== GameStatus.FINAL &&
    fetchingLeagues?.has(game.league) === true;

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Game Status"
      // Every fetch, a poll of the game already on screen included, so a live game
      // being asked about again is said the way a first fetch is.
      busy={isGameLoading && { label: "Fetching the game", tone: "live" }}
      search={
        <DialogCombobox<WeekGame>
          ariaLabel="Game"
          placeholder="Search games..."
          emptyMessage="No matching games"
          items={games}
          filteredItems={matching(games, query, gameSearchText)}
          value={game}
          onValueChange={(next) => setChosen(next.label)}
          query={query}
          onQueryChange={setQuery}
          // The column and the game both, so the reader who came from a cell can
          // tell this is the game they clicked once it fills the input.
          itemToStringLabel={gameSearchText}
          itemKey={(option) => option.label}
          // The chosen game's mark uses the freshest status, not the week's, so going
          // final stops pulsing. The week's stands until the first answer lands.
          adornment={
            game != null && (
              <GameMark
                game={game}
                status={shown?.status ?? game.result?.status}
              />
            )
          }
          renderValue={(chosen) => <GameName game={chosen} />}
          renderOption={(option) => (
            <>
              <GameName game={option} />
              <GameMark game={option} status={option.result?.status} />
            </>
          )}
        />
      }
    >
      <GameStatusSummary
        game={game}
        result={shown}
        myPick={myPick}
        players={scores?.scores}
      />
    </DialogShell>
  );
}
