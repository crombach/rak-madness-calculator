import getClasses from "../../utils/getClasses";
import { outcomeClasses, SideOutcome } from "../gameStatus/Scoreline";
import "./PickBadge.scss";

/**
 * A pick set apart from the words around it, filled the way the picks table fills
 * its cell: green where it scored, red where it missed, plain while the game is open.
 */
export default function PickBadge({
  pick,
  outcome,
}: {
  pick: string;
  outcome?: SideOutcome;
}) {
  return (
    <span className={getClasses("pick-badge", outcomeClasses(outcome))}>
      {pick}
    </span>
  );
}
