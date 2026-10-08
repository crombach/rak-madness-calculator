import { useState } from "react";

/**
 * Text for a `role="status"` region, and a function that announces a message
 * there. A live region speaks only when its text changes, so a message
 * repeated gains or loses a no-break space to be spoken again.
 */
export default function useStatus(): [string, (message: string) => void] {
  const [status, setStatus] = useState("");
  const announce = (message: string) =>
    setStatus((last) => (last === message ? `${message}\u00A0` : message));
  return [status, announce];
}
