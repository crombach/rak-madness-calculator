import { useCallback, useEffect, useMemo, useState } from "react";
import { contentTypeOf, isContentType } from "../utils/contentType";
import latestOnly from "../utils/latestOnly";

type SeasonPicks = {
  season: number;
  weeks: Array<number>;
};

type SeasonsResponse = {
  seasons: Array<SeasonPicks>;
};

// Shared, so a season with no picks answers with the same array every call and
// a caller holding the answer in a dependency list sees it hold still.
const NO_WEEKS: Array<number> = [];

/**
 * The picks in the database, season by season, both newest first.
 *
 * Why the type is checked at all: see `contentType.ts`. A dev server's HTML reads
 * the same as an empty list here, and the caller falls back to the season running
 * now, which is the only one that can be scored from a local upload anyway.
 */
export default function usePicksSeasons() {
  const [picks, setPicks] = useState<Array<SeasonPicks>>();
  const [isSeasonsLoading, setLoading] = useState(true);

  useEffect(
    () =>
      latestOnly(async (isCurrent) => {
        try {
          const response = await fetch("/api/picks");
          if (!response.ok || !isContentType(response, "application/json")) {
            throw new Error(`Seasons response was ${contentTypeOf(response)}`);
          }
          const body: SeasonsResponse = await response.json();
          if (isCurrent()) {
            // A deploy is served the shape before this one out of a cache that
            // has not expired yet, where an entry is the season number itself.
            // Such an entry is dropped rather than read as a season of
            // undefined, which the season picker would offer as an option.
            setPicks(
              body.seasons?.filter(
                (entry) =>
                  Number.isInteger(entry?.season) &&
                  Array.isArray(entry?.weeks),
              ) ?? [],
            );
          }
        } catch (error) {
          console.warn("Could not list the seasons that have picks", error);
        } finally {
          if (isCurrent()) {
            setLoading(false);
          }
        }
      }),
    [],
  );

  const seasons = useMemo(() => picks?.map(({ season }) => season), [picks]);

  /** The weeks that season has picks for, newest first. Empty if it has none. */
  const picksWeeks = useCallback(
    (season?: number) =>
      picks?.find((entry) => entry.season === season)?.weeks ?? NO_WEEKS,
    [picks],
  );

  return useMemo(
    () => ({ seasons, picksWeeks, isSeasonsLoading }),
    [seasons, picksWeeks, isSeasonsLoading],
  );
}
