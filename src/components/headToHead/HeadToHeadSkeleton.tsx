import "./HeadToHead.scss";

// Here rather than in `HeadToHead`, so the skeleton never pulls in the page's chunk.
export const PICKER_LABELS = ["Player", "Versus"] as const;

/** A wireframe of the two pickers and the standing, for while the week or the page loads. */
export default function HeadToHeadSkeleton() {
  return (
    <div className="head-to-head --loading" aria-hidden="true" inert>
      <div className="head-to-head__pickers">
        {PICKER_LABELS.map((label) => (
          <div key={label} className="head-to-head__picker">
            <span className="head-to-head__label">{label}</span>
            <span className="head-to-head__skeleton-bar --field" />
          </div>
        ))}
      </div>
      <span className="head-to-head__skeleton-bar --standing" />
    </div>
  );
}
