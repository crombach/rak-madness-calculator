import { useEffect, useMemo, useState } from "react";
import { contentTypeOf, isContentType } from "../utils/contentType";
import latestOnly from "../utils/latestOnly";

type SeasonsResponse = {
  seasons: Array<number>;
};

/**
 * The seasons that have picks in the database, newest first.
 *
 * Why the type is checked at all: see `contentType.ts`. A dev server's HTML reads
 * the same as an empty list here, and the caller falls back to the season running
 * now, which is the only one that can be scored from a local upload anyway.
 */
export default function usePicksSeasons() {
  const [seasons, setSeasons] = useState<Array<number>>();
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
            setSeasons(body.seasons);
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

  return useMemo(
    () => ({ seasons, isSeasonsLoading }),
    [seasons, isSeasonsLoading],
  );
}
