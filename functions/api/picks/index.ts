import type { Env } from "./env";
import { cachedGet, serviceUnavailable } from "./env";

const PICKS_PREFIX = "picks/";
/** A whole season folder, `picks/2025/`, and nothing else. */
const SEASON_PREFIX = /^picks\/(\d{4})\/$/;

/**
 * The seasons that have picks, newest first.
 *
 * Listed from the bucket rather than written down, so a season starts appearing
 * the moment its first week is uploaded. A season is named by the year it started
 * in, so the 2025 season covers the games played from September 2025 into January
 * 2026.
 */
export const onRequestGet: PagesFunction<Env> = (context) =>
  cachedGet(context, () => listSeasons(context));

async function listSeasons(
  context: Parameters<PagesFunction<Env>>[0],
): Promise<Response> {
  const seasons: Array<number> = [];
  let cursor: string | undefined;

  try {
    do {
      const listed = await context.env.RAK_MADNESS_BUCKET.list({
        prefix: PICKS_PREFIX,
        delimiter: "/",
        cursor,
      });
      listed.delimitedPrefixes.forEach((prefix) => {
        const match = SEASON_PREFIX.exec(prefix);
        if (match != null) {
          seasons.push(Number(match[1]));
        }
      });
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor != null);
  } catch (error) {
    return serviceUnavailable("Failed to list picks seasons", error);
  }

  return new Response(
    JSON.stringify({ seasons: seasons.sort((a, b) => b - a) }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Short, because a newly uploaded season should show up without waiting
        // on a cache, and the list changes at most once a year.
        "Cache-Control": "public, max-age=60",
      },
    },
  );
}
