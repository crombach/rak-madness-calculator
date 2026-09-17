import type { Env } from "./env";
import { cachedGet, serviceUnavailable } from "./env";

const PICKS_PREFIX = "picks/";
/** One week's workbook, `picks/2025/7.xlsx`, and nothing else. */
const WEEK_KEY = /^picks\/(\d{4})\/(\d+)\.xlsx$/;

// Keep in sync with SeasonPicks in src/hooks/usePicksSeasons.ts, which parses
// what this sends. The Functions bundle separately and can't share a type.
type SeasonPicks = {
  season: number;
  weeks: Array<number>;
};

/**
 * The picks in the bucket, season by season, both newest first.
 *
 * Listed from the bucket rather than written down, so a week starts appearing the
 * moment it is uploaded. A season is named by the year it started in, so the 2025
 * season covers the games played from September 2025 into January 2026.
 *
 * The weeks are here because the app opens on the newest week that has picks, and
 * ESPN's calendar has already reached the week being played.
 */
export const onRequestGet: PagesFunction<Env> = (context) =>
  cachedGet(context, () => listPicks(context));

async function listPicks(
  context: Parameters<PagesFunction<Env>>[0],
): Promise<Response> {
  const weeksBySeason = new Map<number, Array<number>>();
  let cursor: string | undefined;

  try {
    do {
      const listed = await context.env.RAK_MADNESS_BUCKET.list({
        prefix: PICKS_PREFIX,
        cursor,
      });
      listed.objects.forEach(({ key }) => {
        const match = WEEK_KEY.exec(key);
        if (match == null) return;
        const season = Number(match[1]);
        const weeks = weeksBySeason.get(season);
        if (weeks == null) {
          weeksBySeason.set(season, [Number(match[2])]);
        } else {
          weeks.push(Number(match[2]));
        }
      });
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor != null);
  } catch (error) {
    return serviceUnavailable("Failed to list picks", error);
  }

  const seasons: Array<SeasonPicks> = [...weeksBySeason]
    .map(([season, weeks]) => ({ season, weeks: weeks.sort((a, b) => b - a) }))
    .sort((a, b) => b.season - a.season);

  return new Response(JSON.stringify({ seasons }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // Short, because a newly uploaded week should show up without waiting on a
      // cache, and the list changes at most once a week.
      "Cache-Control": "public, max-age=60",
    },
  });
}
