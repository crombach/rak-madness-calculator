import { ReactNode } from "react";
import { GameStatus } from "../../types/ESPN";
import { WeekGame } from "../../types/WeekGame";
import {
  CheckIcon,
  EventIcon,
  GroupIcon,
  PauseIcon,
  WarningIcon,
} from "../icon/Icon";
import "./GameMark.scss";

/** What one mark is. It says the state in the shape, the word and the label. */
type Mark = { modifier: string; label: string; icon: ReactNode; word: string };

/**
 * Which mark a game wears, tested in the order the states rule each other out.
 *
 * A column ESPN lists no game for comes before any status, since there is no game
 * to have one. Then the game is tested as its own status says it. Anything ESPN
 * reports that the app does not model falls through to the calendar.
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
  if (status === GameStatus.DELAYED) {
    return {
      modifier: "--delayed",
      label: "Delayed",
      icon: <PauseIcon />,
      word: "DLAY",
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

/** What a game's mark says to a screen reader, for a control that names it. */
export function gameMarkLabel(game: WeekGame, status?: GameStatus): string {
  return markFor(game, status).label;
}

/**
 * Where a game stands, in one mark.
 *
 * Every state says so in a word beside its shape. LIVE beside a red dot for a game
 * being played, DLAY beside a pause for one that has stopped, WARN beside a warning
 * for a column ESPN lists no game for, which is the one game the dialog can say
 * nothing else about, DONE beside a tick once the game is over, and SOON beside a
 * calendar before kickoff. That a live game is being asked about again is the
 * progress bar's to say, which is how every other wait in the app says it.
 */
export default function GameMark({
  game,
  status,
}: {
  game: WeekGame;
  /** The freshest status known, which for a polled game is not the scoring pass's. */
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
      <span className="game-status__mark-word">{word}</span>
    </span>
  );
}

/** A count of players in a mark's pill, to stand beside a game's own mark. */
export function PlayerCountMark({ count }: { count: number }) {
  return (
    <span className="game-status__mark --count">
      <span className="game-status__mark-icon">
        <GroupIcon />
      </span>
      <span className="game-status__mark-word">{count}</span>
    </span>
  );
}
