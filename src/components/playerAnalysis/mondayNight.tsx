import {
  MondayNightOutlook,
  MondayNightRange,
} from "../../types/PlayerAnalysis";
import { Section } from "./analysisParts";
import "./AnalysisSummary.scss";

/** The totals that win, as a comparison on the scoreboard column's own name. */
export function mondayNightPoints({ min, max }: MondayNightRange): string {
  if (min != null && max != null) {
    return min === max ? `MNF Points = ${min}` : `${min} ≤ MNF Points ≤ ${max}`;
  }
  return min != null ? `MNF Points ≥ ${min}` : `MNF Points ≤ ${max}`;
}

/**
 * The totals that win, set the one way wherever they are named.
 *
 * They stand inside a route in one place and inside a sentence in another, and each
 * of those sets its own text. So this sets every part of the face it wants rather
 * than the parts the containers it has today leave alone.
 */
export function MondayNightPoints({ outlook }: { outlook: MondayNightRange }) {
  return (
    <span className="analysis__mnf-points">{mondayNightPoints(outlook)}</span>
  );
}

/**
 * The totals asked for on top of the games above, set out the way those picks are:
 * what to do in the ink they use, and the word holding it to them in their labels'
 * ink.
 *
 * `AND` says the games above are not enough on their own, so it is drawn wherever
 * something stands above to hold the totals to. A block that is the whole answer
 * has nothing above it and takes the line without the word.
 */
export function MondayNightLine({
  outlook,
  conjoined = true,
  // On where the line stands under a route's picks, which it starts in under. Off
  // where it is a block of its own, which starts where the titles beside it do.
  inset = true,
}: {
  outlook: MondayNightRange;
  conjoined?: boolean;
  inset?: boolean;
}) {
  return (
    <p
      className={`analysis__line analysis__route-mnf${inset ? "" : " --flush"}`}
    >
      {conjoined && (
        <>
          {/* A real space, since the gap between these is flex and a reader
              hearing the line is given none by it. */}
          <span className="analysis__pick-label analysis__and">AND</span>{" "}
        </>
      )}
      <MondayNightPoints outlook={outlook} />
    </p>
  );
}

export function MondayNight({
  outlook,
  conjoined,
}: {
  outlook?: MondayNightOutlook;
  conjoined?: boolean;
}) {
  if (outlook == null || outlook.kind === "notNeeded") return null;
  if (outlook.kind === "settled") {
    return (
      <Section conjoined={conjoined} title="MNF Points">
        <p className="analysis__line">
          MNF Points are already final, so the games above settle it.
        </p>
      </Section>
    );
  }
  // The totals are the whole of what this block asks for, so it is the one line a
  // route of its own takes rather than a title over nothing. Every way above needs
  // them, which is what the `AND` on that line says.
  return (
    <MondayNightLine
      outlook={outlook}
      conjoined={conjoined ?? false}
      inset={false}
    />
  );
}
