import { ReactNode, useId } from "react";
import plural from "../../utils/plural";
import CountBadge from "../countBadge/CountBadge";
import "./SectionTitle.scss";

const COUNTED_NOUN = "game";

/**
 * A section's title, its game count in a chip beside it. Only the title carries
 * `id`, so the section is named without the count. Apart from `Games`, so the
 * skeletons never pull in the page's chunk. Swing Games uses it too.
 */
export default function SectionTitle({
  id,
  title,
  count,
}: {
  id?: string;
  title: string;
  count: number;
}) {
  return (
    <h2 className="section-title">
      <span id={id}>{title}</span>{" "}
      <CountBadge>
        <span aria-hidden="true">{count}</span>
        <span className="section-title__sr-only">
          {plural(count, COUNTED_NOUN)}
        </span>
      </CountBadge>
    </h2>
  );
}

/** A section of game cards on either card page, named by its `SectionTitle`. */
export function GameSection({
  className,
  title,
  count,
  children,
}: {
  className: string;
  title: string;
  count: number;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className={className} aria-labelledby={id}>
      <SectionTitle id={id} title={title} count={count} />
      {children}
    </section>
  );
}
