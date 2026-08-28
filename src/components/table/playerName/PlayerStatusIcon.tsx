import { useIsWinnerDecided } from "../../../context/AppDataContext";
import {
  EmojiEventsOutlinedIcon,
  SentimentVerySatisfiedOutlinedIcon,
  SkullOutlinedIcon,
} from "../../icon/Icon";
import "./PlayerStatusIcon.scss";

/**
 * Where a player stands, in one icon. Shared by the tables' name cells and the
 * player analysis search, so the same player is marked the same way in both.
 *
 * Still standing at the end of the week is what winning the week is.
 *
 * Drawn as outlines, against the filled icons the rest of the app uses. A row is
 * a line of text with one of these at the end of it, and a filled shape at that
 * size reads as a blot rather than as a face, a trophy, or a skull.
 */
export default function PlayerStatusIcon({
  isKnockedOut,
}: {
  isKnockedOut: boolean;
}) {
  const isWinnerDecided = useIsWinnerDecided();

  return (
    <span className="player-status-icon">
      {isKnockedOut ? (
        <SkullOutlinedIcon />
      ) : isWinnerDecided ? (
        <EmojiEventsOutlinedIcon />
      ) : (
        <SentimentVerySatisfiedOutlinedIcon />
      )}
    </span>
  );
}
