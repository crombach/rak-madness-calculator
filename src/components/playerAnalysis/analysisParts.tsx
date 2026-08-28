import { ReactNode } from "react";
import { RemainingPick } from "../../types/PlayerAnalysis";
// These render elements of the `analysis` block, which `AnalysisSummary` owns and styles.
import "./AnalysisSummary.scss";

export const NAMES = new Intl.ListFormat("en-US");

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="analysis__section">
      <h3 className="analysis__section-title">{title}</h3>
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
