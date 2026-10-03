import { RESULTS_PAGE } from "../results/resultsPath";
import SkeletonTable from "../table/SkeletonTable";
import { readGameScope, readShowsLeader } from "./comparedPlayers";
import {
  ChooseButton,
  ControlGroup,
  GamesToggle,
  LeaderToggle,
} from "./ComparePlayersControls";
import "./ComparePlayers.scss";

/** A wireframe of the page, for while the week or the page loads. */
export default function ComparePlayersSkeleton() {
  return (
    <>
      <div className="compare-players" aria-hidden="true" inert>
        <div className="compare-players__controls">
          <ControlGroup label="Players">
            <ChooseButton />
            <LeaderToggle on={readShowsLeader()} />
          </ControlGroup>
          <GamesToggle scope={readGameScope()} />
        </div>
      </div>
      <SkeletonTable view={RESULTS_PAGE.comparePlayers} />
    </>
  );
}
