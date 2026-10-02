import {
  useScores,
  useScoringStatus,
  useKnockouts,
} from "../../context/AppDataContext";
import ExperimentalGate from "../results/ExperimentalGate";
import Knockouts from "./Knockouts";

function KnockoutsBody() {
  const { rescore, fetchingLeagues } = useScoringStatus();
  return (
    <Knockouts
      scores={useScores()}
      knockouts={useKnockouts()}
      onPoll={rescore}
      fetchingLeagues={fetchingLeagues}
    />
  );
}

// Knockouts shows only to a reader who opted in to experimental features.
export default function KnockoutsRoute() {
  return (
    <ExperimentalGate>
      <KnockoutsBody />
    </ExperimentalGate>
  );
}
