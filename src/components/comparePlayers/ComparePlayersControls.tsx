import { ReactNode, Ref, useId } from "react";
import doNothing from "../../utils/doNothing";
import getClasses from "../../utils/getClasses";
import Button from "../button/Button";
import { GAME_SCOPES, GameScope } from "./comparedPlayers";
import "./ComparePlayers.scss";

/**
 * A named row of keys. `divided` rules it off from the group before it once
 * the toolbar fits on one line.
 */
export function ControlGroup({
  label,
  divided = false,
  keysClassName,
  children,
}: {
  label: string;
  divided?: boolean;
  keysClassName?: string;
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
        className={getClasses("compare-players__keys", keysClassName)}
        role="group"
        aria-labelledby={labelId}
      >
        {children}
      </div>
    </div>
  );
}

/** A key that opens a dialog. Here, so the wireframe draws the same button. */
function DialogKey({
  label,
  className,
  onClick = doNothing,
  isOpen = false,
  ref,
}: {
  label: string;
  className?: string;
  onClick?: () => void;
  isOpen?: boolean;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <Button
      className={className}
      onClick={onClick}
      popupOpen={isOpen}
      ref={ref}
    >
      {label}
    </Button>
  );
}

type DialogKeyProps = Omit<Parameters<typeof DialogKey>[0], "label">;

/**
 * Choose Players, the leader toggle and Presets. Choose Players spans the
 * other two until the toolbar fits on one line.
 */
export function PlayersGroup({
  choose,
  leader,
  presets,
}: {
  choose?: DialogKeyProps;
  leader: Parameters<typeof LeaderToggle>[0];
  presets?: DialogKeyProps;
}) {
  return (
    <ControlGroup
      label="Players"
      keysClassName="compare-players__keys--players"
    >
      <DialogKey
        label="Choose Players"
        className="compare-players__choose"
        {...choose}
      />
      <LeaderToggle {...leader} />
      <DialogKey label="Presets" {...presets} />
    </ControlGroup>
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
