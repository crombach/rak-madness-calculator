import { useParams } from "react-router";
import { useScores } from "../../context/AppDataContext";
import ExperimentalGate from "../results/ExperimentalGate";
import ComparePlayers from "./ComparePlayers";

export default function ComparePlayersRoute() {
  const { season, week } = useParams();
  const scores = useScores();
  return (
    <ExperimentalGate>
      {/* A new week seeds the pickers afresh from that week's rows. */}
      <ComparePlayers key={`${season}-${week}`} scores={scores} />
    </ExperimentalGate>
  );
}
