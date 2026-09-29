import { useScores } from "../../context/AppDataContext";
import ScoresTable from "../table/scores/ScoresTable";

export default function ScoreboardRoute() {
  return <ScoresTable scores={useScores()} />;
}
