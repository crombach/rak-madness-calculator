import { useIsWinnerDecided } from "../../../context/AppDataContext";
import getClasses from "../../../utils/getClasses";
import {
  EmojiEventsOutlinedIcon,
  SentimentVerySatisfiedOutlinedIcon,
  SkullOutlinedIcon,
  WarningIcon,
} from "../../icon/Icon";
import "./PlayerStatusIcon.scss";

/**
 * Where a player stands, in one icon. Shared by the tables' name cells and the
 * player analysis search, so the same player is marked the same way in both.
 *
 * Still standing at the end of the week is what winning the week is.
 *
 * A name two rows of the workbook share takes the warning a game nobody can score
 * wears, since neither row can be told from the other and no standing read off that
 * name belongs to either of them.
 *
 * Drawn as outlines, against the filled icons the rest of the app uses. A row is
 * a line of text with one of these at the end of it, and a filled shape at that
 * size reads as a blot rather than as a face, a trophy, or a skull.
 */
export default function PlayerStatusIcon({
  isKnockedOut,
  hasNameConflict,
}: {
  isKnockedOut: boolean;
  /** Whether another row of the week was entered under this same name. */
  hasNameConflict?: boolean;
}) {
  const isWinnerDecided = useIsWinnerDecided();

  return (
    <span
      className={getClasses("player-status-icon", {
        "--name-conflict": hasNameConflict === true,
      })}
    >
      {hasNameConflict ? (
        <WarningIcon />
      ) : isKnockedOut ? (
        <SkullOutlinedIcon />
      ) : isWinnerDecided ? (
        <EmojiEventsOutlinedIcon />
      ) : (
        <SentimentVerySatisfiedOutlinedIcon />
      )}
    </span>
  );
}
