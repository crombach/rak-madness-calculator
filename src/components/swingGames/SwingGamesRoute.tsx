import { useAppData } from "../../context/AppDataContext";
import SwingGames from "./SwingGames";

export default function SwingGamesRoute() {
  return <SwingGames scores={useAppData().scores} />;
}
