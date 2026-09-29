import { useScores } from "../../context/AppDataContext";
import SwingGames from "./SwingGames";

export default function SwingGamesRoute() {
  return <SwingGames scores={useScores()} />;
}
