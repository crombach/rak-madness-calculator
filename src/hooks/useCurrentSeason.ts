import { League } from "../types/League";
import getLeagueInfo from "../utils/getLeagueInfo";
import useLatestAsync from "./useLatestAsync";

/**
 * The season running now, by the year it started in, once it has begun.
 *
 * Asked for on its own, because the season list holds only the seasons with picks
 * in the picks store, and the picker has to offer this one once it starts whether or
 * not it has any. A week of it with no picks behind it is scored from a spreadsheet
 * the reader uploads, which is what that path is for.
 *
 * ESPN moves on to the next season as soon as the last one ends, months before
 * anything is played. That season has no week anybody could score, so it is left
 * undefined until its opener, as is a season ESPN could not be asked about at all.
 * The picker then offers the seasons it does know about and nothing else.
 */
async function fetchCurrentSeason(): Promise<number | undefined> {
  // No season named, so ESPN answers with the one running now.
  const proLeagueInfo = await getLeagueInfo(League.PRO);
  return proLeagueInfo?.activeWeek != null ? proLeagueInfo.season : undefined;
}

/** The picker still offers the seasons with picks, so a failure stays quiet. */
function warnCurrentSeasonFailed(error: unknown) {
  console.warn("Could not work out the season running now", error);
}

export default function useCurrentSeason() {
  return useLatestAsync(fetchCurrentSeason, warnCurrentSeasonFailed).data;
}
