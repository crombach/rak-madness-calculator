import { ReactNode, useEffect, useMemo, useState } from "react";
import useArrival from "../../hooks/useArrival";
import useLiveGame from "../../hooks/useLiveGame";
import { GameStatus } from "../../types/ESPN";
import { WeekInfo } from "../../types/League";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import { WeekGame } from "../../types/WeekGame";
import matching from "../../utils/matching";
import warmImage from "../../utils/warmImage";
import DialogCombobox from "../dialog/DialogCombobox";
import DialogShell from "../dialog/DialogShell";
import { CheckIcon, EventIcon, WarningIcon } from "../icon/Icon";
import GameStatusSummary from "./GameStatusSummary";
import "./GameStatusDialog.scss";

/**
 * What a query is matched against: the column the game is, then the game itself.
 *
 * Wider than the input reads once a game is chosen, which is the game alone. The
 * column is how a reader who came from a cell knows which game they clicked, so it
 * is worth typing even where it is not worth keeping on screen.
 */
export function gameSearchText(game: WeekGame): string {
  return `${game.label}  ${game.name}`;
}

/** What one mark is: the state it says, in the shape, the word and the label. */
type Mark = { modifier: string; label: string; icon: ReactNode; word: string };

/**
 * Which mark a game wears, tested in the order the states rule each other out: a
 * column ESPN lists no game for before any status, since there is no game to have
 * one, then the game as its own status says it, with anything ESPN reports that the
 * app does not model falling through to the calendar.
 */
function markFor(game: WeekGame, status?: GameStatus): Mark {
  if (game.result == null) {
    return {
      modifier: "--invalid",
      label: "Not listed by ESPN",
      icon: <WarningIcon />,
      word: "WARN",
    };
  }
  if (status === GameStatus.FINAL) {
    return {
      modifier: "--final",
      label: "Final",
      icon: <CheckIcon />,
      word: "DONE",
    };
  }
  if (status === GameStatus.LIVE) {
    return {
      modifier: "--live",
      label: "Live",
      // Read out by the label rather than as letters, so a reader being read to
      // hears "Live" and not "L I V E".
      icon: <span className="game-status__live-dot" />,
      word: "LIVE",
    };
  }
  return {
    modifier: "--upcoming",
    label: "Yet to kick off",
    icon: <EventIcon />,
    word: "SOON",
  };
}

/**
 * Where a game stands, in one mark, on every game the search offers.
 *
 * Every state says so in a word beside its shape: LIVE beside a red dot for a game
 * being played, WARN beside a warning for a column ESPN lists no game for, which is
 * the one game the dialog can say nothing else about, DONE beside a tick once the
 * game is over, and SOON beside a calendar before kickoff. That a live game is being
 * asked about again is the progress bar's to say, which is how every other wait in
 * the app says it.
 */
function GameMark({
  game,
  status,
}: {
  game: WeekGame;
  /** The freshest status known, which for the chosen game is not the scoring pass's. */
  status?: GameStatus;
}) {
  const { modifier, label, icon, word } = markFor(game, status);
  return (
    <span
      className={`game-status__mark ${modifier}`}
      role="img"
      aria-label={label}
    >
      <span className="game-status__mark-icon">{icon}</span>
      {word}
    </span>
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
  week,
  season,
  onGameFinal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The column the dialog was opened on, by clicking one of its cells. */
  gameLabel?: string;
  scores?: RakMadnessScores;
  /** Which week the games belong to, which fetching one again needs. */
  week?: WeekInfo;
  /** The year that week's season started in. */
  season?: number;
  /**
   * Called once the game shown here is polled final, so the week's scores can
   * be rescored and the table's `.table__cell-wipe` animations can play for
   * whatever that outcome changed, instead of waiting for the next manual
   * refresh.
   */
  onGameFinal?: () => void;
}) {
  const [game, setGame] = useState<WeekGame>();
  const [query, setQuery] = useState("");

  // Held still between renders, since the combobox reads the chosen game back off
  // this list by identity.
  const games = useMemo(() => scores?.games ?? [], [scores]);

  // Every logo the week could show, asked for as soon as the week is scored rather
  // than when a game is opened, so the scoreline comes up with its marks already on
  // it. In an effect rather than in the render, which a search keystroke repeats and
  // React may throw away.
  useEffect(() => {
    games.forEach((it) => {
      [it.result?.home.team.logoUrl, it.result?.away.team.logoUrl].forEach(
        (url) => {
          if (url != null) warmImage(url);
        },
      );
    });
  }, [games]);

  // A column arriving from outside stands in for a choice made in the search.
  useArrival(named, (label) => {
    const arrived = games.find((it) => it.label === label);
    setGame(arrived);
    setQuery(arrived?.name ?? label);
  });

  const { shown, isGameLoading } = useLiveGame({
    open,
    game,
    games: scores?.games,
    week,
    season,
    onGameFinal,
  });

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Game Status"
      // Every fetch, a poll of the game already on screen included, so a live game
      // being asked about again is said the way a first fetch is.
      busy={isGameLoading && { label: "Fetching the game" }}
      search={
        <DialogCombobox<WeekGame>
          ariaLabel="Game"
          placeholder="Search games..."
          emptyMessage="No matching games"
          items={games}
          filteredItems={matching(games, query, gameSearchText)}
          value={game}
          onValueChange={setGame}
          query={query}
          onQueryChange={setQuery}
          // The game alone. The column is what the list is read by and what the
          // search matches, and saying it back here only crowds the game's name.
          itemToStringLabel={(option) => option.name}
          itemKey={(option) => option.label}
          // The chosen game's own mark, on the freshest status rather than the one
          // the week was scored at, so a game going final stops pulsing. The week's
          // own stands until the first answer lands.
          adornment={
            game != null && (
              <GameMark
                game={game}
                status={shown?.status ?? game.result?.status}
              />
            )
          }
          renderOption={(option) => (
            <>
              <span className="game-status__option-label">{option.label}</span>
              <span className="game-status__option-name">{option.name}</span>
              <GameMark game={option} status={option.result?.status} />
            </>
          )}
        />
      }
    >
      <GameStatusSummary game={game} result={shown} />
    </DialogShell>
  );
}
