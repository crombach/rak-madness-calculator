import { useScores } from "../../context/AppDataContext";
import PicksTable from "../table/picks/PicksTable";

export default function PicksRoute() {
  return <PicksTable scores={useScores()} />;
}
