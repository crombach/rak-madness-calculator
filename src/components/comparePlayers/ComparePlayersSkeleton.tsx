import doNothing from "../../utils/doNothing";
import Button from "../button/Button";
import { TuneIcon } from "../icon/Icon";
import { MIN_PICKERS, readComparedPlayers } from "./comparedPlayers";
import "./ComparePlayers.scss";

/**
 * A wireframe of the page above its table, for while the week or the page loads.
 * The prompt shows only where the page will show it, so the table lands in place.
 */
export default function ComparePlayersSkeleton() {
  return (
    <div className="compare-players --loading" aria-hidden="true" inert>
      <div className="compare-players__controls">
        <ChooseButton />
        <GamesToggle />
      </div>
      {readComparedPlayers().length < MIN_PICKERS && (
        <span className="compare-players__skeleton-bar --standing" />
      )}
    </div>
  );
}

/** Opens the dialog. Here, so the wireframe draws the same button. */
export function ChooseButton({
  onClick = doNothing,
}: {
  onClick?: () => void;
}) {
  return (
    <Button className="compare-players__choose" onClick={onClick}>
      <TuneIcon />
      Choose players
    </Button>
  );
}

/** The table's two scopes, by whether it shows every game. */
const GAME_SCOPES = [
  { showsAll: false, label: "Different" },
  { showsAll: true, label: "All" },
] as const;

/** Picks whether the table shows every game or only those picked differently. */
export function GamesToggle({
  showsAll = false,
  onChange = doNothing,
  disabled = false,
}: {
  showsAll?: boolean;
  onChange?: (showsAll: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="compare-players__scopes" role="group" aria-label="Games">
      {GAME_SCOPES.map(({ showsAll: value, label }) => (
        <Button
          key={label}
          disabled={disabled}
          selected={showsAll === value}
          onClick={() => onChange(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
