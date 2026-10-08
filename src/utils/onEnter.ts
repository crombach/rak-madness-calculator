import { KeyboardEvent } from "react";

/**
 * A field's key handler that runs `action` on Enter, as a form's submit would.
 * An input method's Enter only confirms the composed text, so it is skipped.
 * `preventDefault` stops the same press from clicking the key that takes focus.
 */
export default function onEnter(
  action?: (event: KeyboardEvent<HTMLInputElement>) => void,
) {
  return (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    action?.(event);
  };
}
