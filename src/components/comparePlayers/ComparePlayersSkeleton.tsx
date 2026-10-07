import { useIsWeekSettled } from "../../context/AppDataContext";
import { RESULTS_PAGE } from "../results/resultsPath";
import SkeletonTable from "../table/SkeletonTable";
import { readGameScope, readShowsLeader } from "./comparedPlayers";
import { GamesToggle, PlayersGroup } from "./ComparePlayersControls";
import "./ComparePlayers.scss";

/** A wireframe of the page, for while the week or the page loads. */
export default function ComparePlayersSkeleton() {
  // This browser's record of the week, so a complete one's key says Winner
  // before its scores arrive.
  const isSettled = useIsWeekSettled();
  return (
    <>
      <div className="compare-players" aria-hidden="true" inert>
        <div className="compare-players__controls">
          <PlayersGroup leader={{ on: readShowsLeader(), isSettled }} />
          <GamesToggle scope={readGameScope()} />
        </div>
      </div>
      <SkeletonTable view={RESULTS_PAGE.comparePlayers} />
    </>
  );
}
