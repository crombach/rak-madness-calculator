import { ReactNode } from "react";
import "./CountBadge.scss";

/**
 * A count set in a small fill beside the word it counts, so `1 KC` does not read as
 * one word. The same face, size, weight and edge as `PickBadge`, so the two stand the
 * same height side by side.
 */
export default function CountBadge({ children }: { children: ReactNode }) {
  return <span className="count-badge">{children}</span>;
}
