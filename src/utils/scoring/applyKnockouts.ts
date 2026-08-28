import { PlayerScore } from "../../types/RakMadnessScores";
import plural from "../plural";
import { pickDifference, RemainingGame } from "./remainingGames";
import weekShape from "./weekShape";

function remainingSuffix(
  weekOver: boolean,
  count: number,
  noun: string,
  tail = "",
): string {
  return weekOver ? "." : ` with ${plural(count, noun)} remaining${tail}.`;
}

function knockedOut(score: PlayerScore, explanation: string): PlayerScore {
  return {
    ...score,
    status: { ...score.status, isKnockedOut: true, explanation },
  };
}

type PairDifferences = {
  differentCollegePicks: number;
  differentProPicks: number;
  differentProPicksWithSpreads: number;
};

/**
 * How many of the games still to be played these two players have picked
 * differently, split by the tiebreaker tier each one can move.
 *
 * A game the rival left blank counts, because the active player can take a point
 * there that the rival cannot.
 */
function countDifferences(
  games: Array<RemainingGame>,
  activeIndex: number,
  rivalIndex: number,
): PairDifferences {
  const differences = {
    differentCollegePicks: 0,
    differentProPicks: 0,
    differentProPicksWithSpreads: 0,
  };
  games.forEach((game) => {
    if (pickDifference(game, activeIndex, rivalIndex) === "none") return;
    const activeCell = game.cells[activeIndex];
    if (game.league === "college") {
      differences.differentCollegePicks += 1;
      return;
    }
    differences.differentProPicks += 1;
    if (activeCell.hasSpread) {
      differences.differentProPicksWithSpreads += 1;
    }
  });
  return differences;
}

/**
 * Marks every player who can no longer catch the leader, with the reason.
 *
 * Assumes the team abbreviations are all correct. If they are not, or the games
 * cannot be found for some other reason, the results will be wrong.
 */
export default function applyKnockouts(
  sortedScores: Array<PlayerScore>,
  tiebreakerScore?: number,
): Array<PlayerScore> {
  // One walk. Asking `remainingGames` and `isWeekOver` apart reads every pick of
  // every player three times over.
  const { remaining: games, isOver: weekOver } = weekShape(sortedScores);
  const isCollegeDone = games.every((game) => game.league !== "college");

  return sortedScores.map((activeScore, activeIndex) => {
    // If a player has no picks, they're knocked out.
    if (activeScore.status.hasNoPicks) {
      return knockedOut(activeScore, "Knocked out due to having no picks.");
    }

    // The leader sorts first and cannot be knocked out, so skip them.
    // Everyone else is measured against every player level with them or ahead,
    // including ones ranked below them, which is where an equal score with the
    // same Monday night pick is settled.
    if (activeIndex > 0) {
      for (
        let rivalIndex = 0;
        rivalIndex < sortedScores.length &&
        sortedScores[rivalIndex].score.total >= activeScore.score.total;
        rivalIndex++
      ) {
        const rivalScore = sortedScores[rivalIndex];

        // No use comparing a player to themself or a player with no picks.
        if (rivalIndex === activeIndex || rivalScore.status.hasNoPicks)
          continue;

        const {
          differentCollegePicks,
          differentProPicks,
          differentProPicksWithSpreads,
        } = countDifferences(games, activeIndex, rivalIndex);

        const totalScoreDiff = rivalScore.score.total - activeScore.score.total;
        const totalDifferentPicks = differentCollegePicks + differentProPicks;
        if (totalDifferentPicks < totalScoreDiff) {
          // If the active player can't catch up on points, they're knocked out.
          return knockedOut(
            activeScore,
            `Knocked out on Total Score by ${rivalScore.name}. ` +
              `Behind by ${totalScoreDiff}` +
              remainingSuffix(weekOver, totalDifferentPicks, "different pick"),
          );
        } else if (totalDifferentPicks === totalScoreDiff) {
          // Either distance is absent when that player left the Monday night
          // points cell blank, even once the game itself is final.
          const rivalDistance = rivalScore.tiebreaker.distance;
          const activeDistance = activeScore.tiebreaker.distance;
          // If the best a player can do is tie the rival, check if they're knocked out on breakers.
          if (
            rivalScore.tiebreaker.pick === activeScore.tiebreaker.pick ||
            (tiebreakerScore != null && rivalDistance === activeDistance)
          ) {
            // If the active player has the same tiebreaker pick as the rival, run through the list of other tiebreakers.
            // If the rival has a better college score, check if the active player can catch up.
            const collegeScoreDiff =
              rivalScore.score.college - activeScore.score.college;
            if (
              collegeScoreDiff > 0 &&
              differentCollegePicks < collegeScoreDiff
            ) {
              return knockedOut(
                activeScore,
                `Knocked out on College Score tiebreaker by ${rivalScore.name}. ` +
                  `Behind by ${collegeScoreDiff}` +
                  remainingSuffix(
                    weekOver,
                    differentCollegePicks,
                    "different college pick",
                  ),
              );
            }
            // If college games are done and players are tied, check pro against the spread tiebreaker.
            if (collegeScoreDiff === 0 && isCollegeDone) {
              const proAgainstTheSpreadScoreDiff =
                rivalScore.score.proAgainstTheSpread -
                activeScore.score.proAgainstTheSpread;
              if (
                proAgainstTheSpreadScoreDiff > 0 &&
                differentProPicksWithSpreads < proAgainstTheSpreadScoreDiff
              ) {
                return knockedOut(
                  activeScore,
                  `Knocked out on Pro Score Against the Spread tiebreaker by ${rivalScore.name}. ` +
                    `Behind by ${proAgainstTheSpreadScoreDiff}` +
                    remainingSuffix(
                      weekOver,
                      differentProPicksWithSpreads,
                      "different pick",
                      " for pro games with spreads",
                    ),
                );
              }
            }
          } else if (
            tiebreakerScore != null &&
            rivalDistance != null &&
            activeDistance != null &&
            rivalDistance - activeDistance < 0
          ) {
            // If the tiebreaker score has been scraped, all games must be over.
            // Unless the active player has tied the rival, they are knocked out.
            return knockedOut(
              activeScore,
              `Knocked out on MNF Points tiebreaker by ${rivalScore.name}. ` +
                `${activeScore.name} is ${plural(activeDistance, "point")} off, and ${rivalScore.name} is ` +
                `${plural(rivalDistance, "point")} off.`,
            );
          }
        }
      }
    }

    return {
      ...activeScore,
      status: {
        ...activeScore.status,
        isKnockedOut: false,
        explanation: tiebreakerScore != null ? "Winner!" : "Not knocked out!",
      },
    };
  });
}
