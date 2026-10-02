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

export default function KnockoutsRoute() {
  return (
    <ExperimentalGate>
      <KnockoutsBody />
    </ExperimentalGate>
  );
}
