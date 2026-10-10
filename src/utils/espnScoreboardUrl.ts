import { League } from "../types/League";

/** ESPN's site API for football, which every league's endpoints sit under. */
export const ESPN_FOOTBALL_API =
  "https://site.api.espn.com/apis/site/v2/sports/football";

/**
 * The ESPN scoreboard endpoint for a league, with the parameters that are set.
 * Left-out ones are dropped, in the order given.
 */
export default function espnScoreboardUrl(
  league: League,
  params: Record<string, string | number | undefined> = {},
): string {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value != null) {
      query.set(name, String(value));
    }
  }
  const queryString = query.toString();
  const search = queryString !== "" ? `?${queryString}` : "";
  return `${ESPN_FOOTBALL_API}/${league}/scoreboard${search}`;
}
