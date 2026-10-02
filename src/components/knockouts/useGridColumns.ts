import { RefObject, useLayoutEffect, useState } from "react";
import observeResize from "../../utils/observeResize";

/** How many tracks a computed `grid-template-columns` lists, 0 for `none`. */
export function trackCount(template: string): number {
  if (template === "" || template === "none") return 0;
  return template.trim().split(/\s+/).length;
}

/**
 * How many columns the grid lays out, read off the rendered grid. `fallback` stands
 * until a measurement lands, and a grid that measures none, being hidden, keeps
 * the count it had.
 */
export default function useGridColumns(
  grid: RefObject<HTMLElement | null>,
  fallback: number,
): number {
  const [columns, setColumns] = useState(fallback);

  useLayoutEffect(() => {
    const measure = () => {
      if (grid.current == null) return;
      const count = trackCount(
        getComputedStyle(grid.current).gridTemplateColumns,
      );
      if (count > 0) setColumns(count);
    };
    measure();
    return observeResize([grid.current], measure);
  }, [grid]);

  return columns;
}
