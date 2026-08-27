/**
 * The callback a default stands in with, for a prop or a context whose absence is
 * ordinary rather than a mistake.
 *
 * One shared identity, so a default that reaches a dependency array or a memo
 * comparison is the same reference on every render.
 */
export default function doNothing(): undefined {
  return undefined;
}
