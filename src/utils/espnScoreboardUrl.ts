import { League } from "../types/League";

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
  return `https://site.api.espn.com/apis/site/v2/sports/football/${league}/scoreboard${search}`;
}
