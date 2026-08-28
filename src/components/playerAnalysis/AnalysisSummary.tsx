import { PlayerAnalysis } from "../../types/PlayerAnalysis";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import weekShape, { WeekShape } from "../../utils/scoring/weekShape";
import AnalysisBody from "./AnalysisBody";
import Standing from "./Standing";
import "./AnalysisSummary.scss";

/**
 * The whole answer to a player: where they stand, then what that leaves them.
 *
 * The standing belongs to this component rather than to the dialog around it,
 * because there is one headline slot and two components rendering it can put two
 * headlines on screen at once.
 */
export default function AnalysisSummary({
  scores,
  playerName,
  result,
  shape,
  weekNumber,
}: {
  scores?: RakMadnessScores;
  /** The player picked, whose standing heads the answer. */
  playerName?: string;
  result?: PlayerAnalysis;
  /**
   * What is left of the week, which the "clinched" case reads. Left out, it is
   * worked out here. Read once and handed to both halves, so neither can
   * disagree with the other and the walk behind it runs once.
   */
  shape?: WeekShape;
  /** Which week this is, named by the one line that congratulates a winner. */
  weekNumber?: number;
}) {
  // Nothing under the search until a name is picked, which the placeholder in it
  // already asks for.
  if (playerName == null && result == null) return null;

  const week = shape ?? weekShape(scores?.scores ?? []);
  return (
    <div className="analysis">
      <Standing
        scores={scores}
        playerName={playerName}
        result={result}
        shape={week}
      />
      {result != null && (
        <div className="analysis__body">
          <AnalysisBody
            result={result}
            isOver={week.isOver}
            weekNumber={weekNumber}
          />
        </div>
      )}
    </div>
  );
}
