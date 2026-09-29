import { useAppData } from "../../context/AppDataContext";
import ExperimentalGate from "../results/ExperimentalGate";
import Games from "./Games";

export default function GamesRoute() {
  const { scores, rescore, fetchingLeagues } = useAppData();
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
