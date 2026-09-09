import { ReactNode } from "react";
import { RemainingPick } from "../../types/PlayerAnalysis";
import "./AnalysisSummary.scss";

export function Section({
  title,
  // On whether a block above this one is needed too. A gap between blocks
  // doesn't say that. `And` on the title makes the two read as one condition.
  conjoined,
  children,
}: {
  title: string;
  conjoined?: boolean;
  // Absent where the title says the whole of what the block asks for.
  children?: ReactNode;
}) {
  return (
    <section className="analysis__section">
      {/* In the title rather than over it, which costs no height. Read out with
          it too, since a reader hearing the blocks needs the word. */}
      <h3 className="analysis__section-title">
        {conjoined && <span className="analysis__and">And</span>} {title}
      </h3>
      {children}
    </section>
  );
}

export function Picks({
  games,
  className,
}: {
  games: Array<RemainingPick>;
  className?: string;
}) {
  return (
    <ul
      className={className ? `analysis__picks ${className}` : "analysis__picks"}
    >
      {games.map((game) => (
        <li key={game.label} className="analysis__pick">
          <span className="analysis__pick-label">{game.label}</span>
          <span className="analysis__pick-team">{game.pick}</span>
        </li>
      ))}
    </ul>
  );
}

/** A line absent is one the answer did not call for, so the caller can pass it. */
export function Message({ lines }: { lines: Array<string | undefined> }) {
  return (
    <div className="analysis__message">
      {lines
        .filter((line) => line != null)
        .map((line) => (
          <p key={line} className="analysis__line">
            {line}
          </p>
        ))}
    </div>
  );
}
