import { useId } from "react";
import doNothing from "../../utils/doNothing";
import Button from "../button/Button";
import { RESULTS_PAGE } from "../results/resultsPath";
import SkeletonTable from "../table/SkeletonTable";
import { GAME_SCOPES, GameScope, readGameScope } from "./comparedPlayers";
import "./ComparePlayers.scss";

/** A wireframe of the page, for while the week or the page loads. */
export default function ComparePlayersSkeleton() {
  return (
    <>
      <div className="compare-players" aria-hidden="true" inert>
        <div className="compare-players__controls">
          <ChooseButton />
          <GamesToggle scope={readGameScope()} />
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

const SCOPE_LABELS: Record<GameScope, string> = {
  all: "All",
  different: "Different",
  same: "Same",
};

/** Picks which games the table shows: every one, or those picked differently or alike. */
export function GamesToggle({
  scope,
  onChange = doNothing,
  disabled = false,
}: {
  scope: GameScope;
  onChange?: (scope: GameScope) => void;
  disabled?: boolean;
}) {
  const labelId = useId();
  return (
    <div className="compare-players__games">
      <span className="compare-players__divider" />
      <span id={labelId} className="compare-players__games-label">
        Games
      </span>
      <div
        className="compare-players__scopes"
        role="group"
        aria-labelledby={labelId}
      >
        {GAME_SCOPES.map((value) => (
          <Button
            key={value}
            disabled={disabled}
            selected={scope === value}
            onClick={() => onChange(value)}
          >
            {SCOPE_LABELS[value]}
          </Button>
        ))}
      </div>
    </div>
  );
}
