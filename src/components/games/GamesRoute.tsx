import { useScores, useScoringStatus } from "../../context/AppDataContext";
import ExperimentalGate from "../results/ExperimentalGate";
import Games from "./Games";

export default function GamesRoute() {
  const scores = useScores();
  const { rescore, fetchingLeagues } = useScoringStatus();
  return (
    <ExperimentalGate>
      <Games
        scores={scores}
        onPoll={rescore}
        fetchingLeagues={fetchingLeagues}
      />
    </ExperimentalGate>
  );
}
