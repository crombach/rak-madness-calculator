import {
  useScores,
  useScoringStatus,
  useKnockouts,
} from "../../context/AppDataContext";
import Knockouts from "./Knockouts";

export default function KnockoutsRoute() {
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
