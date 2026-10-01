import plural from "../../utils/plural";

const COUNTED_NOUN = "game";

/**
 * A section's title, its game count in a chip beside it. Only the title carries
 * `id`, so the section is named without the count. Apart from `Games`, so the
 * skeleton never pulls in the page's chunk.
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
    <h2 className="games__section-title">
      <span id={id}>{title}</span>{" "}
      <span className="games__section-count">
        <span aria-hidden="true">{count}</span>
        <span className="games__sr-only">{plural(count, COUNTED_NOUN)}</span>
      </span>
    </h2>
  );
}
