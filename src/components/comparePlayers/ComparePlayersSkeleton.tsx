import doNothing from "../../utils/doNothing";
import Button from "../button/Button";
import { RESULTS_PAGE } from "../results/resultsPath";
import SkeletonTable from "../table/SkeletonTable";
import { readShowsAll } from "./comparedPlayers";
import "./ComparePlayers.scss";

/** A wireframe of the page, for while the week or the page loads. */
export default function ComparePlayersSkeleton() {
  return (
    <>
      <div className="compare-players" aria-hidden="true" inert>
        <div className="compare-players__controls">
          <ChooseButton />
          <GamesToggle showsAll={readShowsAll()} />
        </div>
      </div>
      <SkeletonTable view={RESULTS_PAGE.comparePlayers} />
    </>
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
      Choose Players
    </Button>
  );
}

/** The table's two scopes, by whether it shows every game. */
const GAME_SCOPES = [
  { showsAll: false, label: "Different Picks" },
  { showsAll: true, label: "All Picks" },
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
