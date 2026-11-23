import useMyMustWinLabels from "../../hooks/useMyMustWinLabels";
import getClasses from "../../utils/getClasses";
import "./GameId.scss";

export const MUST_WIN_WORD = "must win";

/** The caller's class sets the face and size, since each place an ID shows has its own. */
export default function GameId({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const isMustWin = useMyMustWinLabels().has(label);
  return (
    <span
      className={getClasses("game-id", className, isMustWin && "--must-win")}
    >
      {label}
      {isMustWin && <span className="game-id__sr-only"> {MUST_WIN_WORD}</span>}
    </span>
  );
}
