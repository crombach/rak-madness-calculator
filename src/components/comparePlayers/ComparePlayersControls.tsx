import { ReactNode, Ref, useId } from "react";
import doNothing from "../../utils/doNothing";
import Button from "../button/Button";
import { GAME_SCOPES, GameScope } from "./comparedPlayers";
import "./ComparePlayers.scss";

/**
 * A named row of keys. `divided` rules it off from the group before it on a wide
 * screen.
 */
export function ControlGroup({
  label,
  divided = false,
  children,
}: {
  label: string;
  divided?: boolean;
  children: ReactNode;
}) {
  const labelId = useId();
  return (
    <div className="compare-players__group">
      {divided && <span className="compare-players__divider" />}
      <span id={labelId} className="compare-players__group-label">
        {label}
      </span>
      <div
        className="compare-players__keys"
        role="group"
        aria-labelledby={labelId}
      >
        {children}
      </div>
    </div>
  );
}

/** Opens the dialog. Here, so the wireframe draws the same button. */
export function ChooseButton({
  onClick = doNothing,
  ref,
}: {
  onClick?: () => void;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <Button className="compare-players__choose" onClick={onClick} ref={ref}>
      Choose
    </Button>
  );
}

/** Adds the week's leader to the players chosen. Reads "Show Winner" once the week is complete. */
export function LeaderToggle({
  on,
  isSettled = false,
  onChange = doNothing,
  disabled = false,
}: {
  on: boolean;
  isSettled?: boolean;
  onChange?: (on: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Button disabled={disabled} selected={on} onClick={() => onChange(!on)}>
      {isSettled ? "Show Winner" : "Show Leader"}
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
  return (
    <ControlGroup label="Games" divided>
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
    </ControlGroup>
  );
}
