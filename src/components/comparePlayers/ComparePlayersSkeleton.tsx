import doNothing from "../../utils/doNothing";
import Button from "../button/Button";
import { AddIcon } from "../icon/Icon";
import {
  MIN_PICKERS,
  pickerLabel,
  readComparedPlayers,
} from "./comparedPlayers";
import "./ComparePlayers.scss";

/**
 * A wireframe of the pickers and the standing, for while the week or the page
 * loads. As many pickers as the reader last chose, so the page opens at its
 * loaded size.
 */
export default function ComparePlayersSkeleton() {
  const count = Math.max(MIN_PICKERS, readComparedPlayers().length);
  return (
    <div className="compare-players --loading" aria-hidden="true" inert>
      <div className="compare-players__pickers">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="compare-players__picker">
            <span className="compare-players__label">{pickerLabel(index)}</span>
            <span className="compare-players__skeleton-bar --field" />
          </div>
        ))}
      </div>
      <AddButton />
      <span className="compare-players__skeleton-bar --standing" />
    </div>
  );
}

/** Adds a picker. Here, so the wireframe draws the same button. */
export function AddButton({
  disabled = false,
  onClick = doNothing,
}: {
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      className="compare-players__add"
      variant="soft"
      size="sm"
      disabled={disabled}
      onClick={onClick}
    >
      <AddIcon />
      Add player
    </Button>
  );
}
