import { useParams } from "react-router";
import { useAppData } from "../../context/AppDataContext";
import SwingGames from "./SwingGames";

export default function SwingGamesRoute() {
  const { season, week } = useParams();
  return (
    <SwingGames scores={useAppData().scores} season={season} week={week} />
  );
}
