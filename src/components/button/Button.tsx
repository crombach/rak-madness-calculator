import { Button as BaseButton } from "@base-ui/react/button";
import { ReactNode } from "react";
import doNothing from "../../utils/doNothing";
import getClasses from "../../utils/getClasses";
import "./Button.scss";

export type ButtonColor = "primary" | "success" | "danger" | "info" | "warning";

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
  ariaExpanded,
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
   * tab order and looking like itself, which `disabled` does neither of, for a
   * control that is only waiting on something.
   */
  ariaDisabled?: boolean;
  /** Set while the button's own work is running. Draws the shared loading sheen. */
  busy?: boolean;
  /** Set where the button is one of a set and shows which one is chosen. */
  selected?: boolean;
  className?: string;
  /** The accessible name. Required of a button whose content is an icon alone. */
  ariaLabel?: string;
  /** Set where the button opens and closes something below it. */
  ariaExpanded?: boolean;
}) {
  const classes = getClasses(
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
      // delay below still needs to apply.
      "--selectable": selected !== undefined,
      "--selected": !!selected,
      "--busy": busy,
    },
    className,
  );
  return (
    <BaseButton
      type="button"
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-pressed={selected}
      aria-disabled={ariaDisabled || undefined}
      aria-busy={busy || undefined}
      className={classes}
      disabled={disabled}
      onClick={ariaDisabled ? doNothing : onClick}
    >
      {children}
    </BaseButton>
  );
}
