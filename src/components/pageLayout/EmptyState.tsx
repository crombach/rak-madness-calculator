import { ReactNode } from "react";
import getClasses from "../../utils/getClasses";
import "./EmptyState.scss";

/**
 * The line a page says in place of content it has none of. A live region, so it is
 * read when it appears. Left empty it stays in the accessibility tree and says
 * nothing, which a region needs before its text arrives.
 */
export default function EmptyState({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <p className={getClasses("empty-state", className)} role="status">
      {children}
    </p>
  );
}
