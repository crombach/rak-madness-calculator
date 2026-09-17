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
            setPicks(body.seasons);
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

  /** The newest week that season has picks for, undefined if it has none. */
  const latestPicksWeek = useCallback(
    (season?: number) =>
      picks?.find((entry) => entry.season === season)?.weeks[0],
    [picks],
  );

  return useMemo(
    () => ({ seasons, latestPicksWeek, isSeasonsLoading }),
    [seasons, latestPicksWeek, isSeasonsLoading],
  );
}
