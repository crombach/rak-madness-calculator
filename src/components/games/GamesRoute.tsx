import { useScores, useScoringStatus } from "../../context/AppDataContext";
import Games from "./Games";

export default function GamesRoute() {
  const scores = useScores();
  const { rescore, fetchingLeagues } = useScoringStatus();
  return (
    <Games scores={scores} onPoll={rescore} fetchingLeagues={fetchingLeagues} />
  );
}
