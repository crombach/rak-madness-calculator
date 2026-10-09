import { ReactNode } from "react";
import ComparePlayersSkeleton from "../comparePlayers/ComparePlayersSkeleton";
import GamesSkeleton from "../games/GamesSkeleton";
import KnockoutsSkeleton from "../knockouts/KnockoutsSkeleton";
import SkeletonTable from "../table/SkeletonTable";
import { RESULTS_PAGE, ResultsPage } from "./resultsPath";

/** The wireframe each page stands as while its week loads. */
const SKELETONS: Record<ResultsPage, ReactNode> = {
  [RESULTS_PAGE.scoreboard]: <SkeletonTable view={RESULTS_PAGE.scoreboard} />,
  [RESULTS_PAGE.picks]: <SkeletonTable view={RESULTS_PAGE.picks} />,
  [RESULTS_PAGE.knockouts]: <KnockoutsSkeleton />,
  [RESULTS_PAGE.games]: <GamesSkeleton />,
  [RESULTS_PAGE.comparePlayers]: <ComparePlayersSkeleton />,
};

export default SKELETONS;
