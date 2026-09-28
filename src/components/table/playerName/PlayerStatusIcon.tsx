import { useIsWeekWon } from "../../../context/AppDataContext";
import getClasses from "../../../utils/getClasses";
import {
  EmojiEventsOutlinedIcon,
  SentimentVerySatisfiedOutlinedIcon,
  SkullOutlinedIcon,
  WarningOutlinedIcon,
} from "../../icon/Icon";
import "./PlayerStatusIcon.scss";

/**
 * Where a player stands, in one icon. Shared by the tables' name cells and the
 * player analysis search, so the same player is marked the same way in both.
 *
 * A player still standing at the end of the week wins it. So does one left
 * standing alone before then.
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
  isWeekWon,
}: {
  isKnockedOut: boolean;
  /** Whether another row of the week was entered under this same name. */
  hasNameConflict?: boolean;
  /**
   * Whether the week has its winner, for a caller drawing a moment other than now.
   * The wipe over a player just knocked out draws where they stood before, and
   * nobody had won the week then.
   */
  isWeekWon?: boolean;
}) {
  const isWeekWonNow = useIsWeekWon();
  const showTrophy = isWeekWon ?? isWeekWonNow;

  return (
    <span
      className={getClasses("player-status-icon", {
        "--name-conflict": hasNameConflict === true,
      })}
    >
      {hasNameConflict ? (
        <WarningOutlinedIcon />
      ) : isKnockedOut ? (
        <SkullOutlinedIcon />
      ) : showTrophy ? (
        <EmojiEventsOutlinedIcon />
      ) : (
        <SentimentVerySatisfiedOutlinedIcon />
      )}
    </span>
  );
}
