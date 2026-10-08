import { Button as BaseButton } from "@base-ui/react/button";
import { PointerEvent, ReactNode, Ref, SyntheticEvent } from "react";
import doNothing from "../../utils/doNothing";
import getClasses from "../../utils/getClasses";
import "./Button.scss";

export type ButtonColor = "primary" | "success" | "danger" | "info" | "warning";

/**
 * The className `Button` renders with, kept callable on its own for a caller that
 * has to render a different element in the app's one button shape, such as
 * `Menu.Trigger`.
 */
export function buttonClasses({
  color = "primary",
  variant = "solid",
  size = "md",
  iconOnly = false,
  compact = false,
  selected,
  busy = false,
  className = "",
}: {
  color?: ButtonColor;
  variant?: "solid" | "soft";
  size?: "md" | "sm";
  iconOnly?: boolean;
  compact?: boolean;
  selected?: boolean;
  busy?: boolean;
  className?: string;
} = {}): string {
  return getClasses(
    "button",
    {
      [`--${variant}`]: true,
      [`--${color}`]: true,
      "--sm": size === "sm",
      "--icon": iconOnly,
      "--compact": compact,
      // Set whenever `selected` is passed at all, true or false, not just when
      // held. `--selected` alone cannot carry this: it disappears the moment
      // the route deselects the button, which is exactly when the release
      // delay in `Button.scss`'s `--selectable` rule still needs to apply.
      "--selectable": selected !== undefined,
      "--selected": !!selected,
      "--busy": busy,
    },
    className,
  );
}

/**
 * Firefox on Android can hold `:active` on a key after the finger lifts, until
 * the next tap lands somewhere else. A key that should rise, such as a toggle
 * turned off, then stays down. `Button.scss` presses only a key not marked
 * released. Set on the element rather than in state, so a tap renders nothing.
 */
function markReleased(event: PointerEvent<HTMLButtonElement>) {
  if (event.pointerType === "touch") {
    event.currentTarget.dataset.released = "";
  }
}

/**
 * Clears the released mark, so a new press shows, whether a pointer or a key
 * makes it. Marks a key pressed while chosen. That press turns it off, so
 * `Button.scss` lets it rise without the pause that holds a key about to be
 * chosen.
 */
function startPress(event: SyntheticEvent<HTMLButtonElement>) {
  const key = event.currentTarget;
  delete key.dataset.released;
  key.toggleAttribute(
    "data-was-selected",
    key.getAttribute("aria-pressed") === "true",
  );
}

export default function Button({
  children,
  onClick,
  color = "primary",
  variant = "solid",
  size = "md",
  iconOnly = false,
  compact = false,
  disabled = false,
  ariaDisabled = false,
  busy = false,
  selected,
  className = "",
  ariaLabel,
  ariaDescribedBy,
  ariaExpanded,
  popupOpen,
  ref,
}: {
  children: ReactNode;
  onClick: () => void;
  color?: ButtonColor;
  variant?: "solid" | "soft";
  size?: "md" | "sm";
  iconOnly?: boolean;
  /** Tighter side padding, for a bar that has more buttons than room. */
  compact?: boolean;
  disabled?: boolean;
  /**
   * Unavailable for now rather than unavailable outright. Keeps the button in the
   * tab order and looking like itself, for a control that is only waiting on
   * something. `disabled` does neither.
   */
  ariaDisabled?: boolean;
  /** Set while the button's own work is running. Draws the shared loading sheen. */
  busy?: boolean;
  /** Set where the button is one of a set and shows which one is chosen. */
  selected?: boolean;
  className?: string;
  /** The accessible name. Required of a button whose content is an icon alone. */
  ariaLabel?: string;
  /** Names the element that describes this button, such as the reason it is disabled. */
  ariaDescribedBy?: string;
  /** Set where the button opens and closes something below it. */
  ariaExpanded?: boolean;
  /**
   * Set where the button opens a dialog, true while it is open. Says so to a
   * screen reader, and holds the key down as Base UI's `data-popup-open` does
   * for a menu's own trigger.
   */
  popupOpen?: boolean;
  ref?: Ref<HTMLButtonElement>;
}) {
  const classes = buttonClasses({
    color,
    variant,
    size,
    iconOnly,
    compact,
    selected,
    busy,
    className,
  });
  return (
    <BaseButton
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-haspopup={popupOpen === undefined ? undefined : "dialog"}
      aria-expanded={ariaExpanded ?? popupOpen}
      aria-pressed={selected}
      aria-disabled={ariaDisabled || undefined}
      aria-busy={busy || undefined}
      data-popup-open={popupOpen ? "" : undefined}
      className={classes}
      disabled={disabled}
      onClick={ariaDisabled ? doNothing : onClick}
      onPointerDown={startPress}
      onKeyDown={startPress}
      onPointerUp={markReleased}
      onPointerCancel={markReleased}
    >
      {children}
    </BaseButton>
  );
}
