import { RefObject, useEffect, useState } from "react";

/**
 * Whether a key that loses data is armed. Its first press arms it and its
 * second acts, so one stray tap loses nothing. A press or focus outside
 * `inside` disarms it. Both, since Safari does not focus a tapped button.
 */
export default function useArmed(
  ...inside: Array<RefObject<HTMLElement | null>>
): [boolean, (armed: boolean) => void] {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const disarm = (event: Event) => {
      const target = event.target as Node;
      if (!inside.some((ref) => ref.current?.contains(target))) setArmed(false);
    };
    const events = ["pointerdown", "focusin"];
    events.forEach((type) => document.addEventListener(type, disarm));
    return () =>
      events.forEach((type) => document.removeEventListener(type, disarm));
    // The refs hold still, so only arming starts or stops the listeners.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed]);
  return [armed, setArmed];
}
