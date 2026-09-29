import { WeekInfo } from "../types/League";
import { XLSX_CONTENT_TYPE } from "./buildSpreadsheetBuffer";
import { contentTypeOf, isContentType } from "./contentType";
import { readCachedPicks, writeCachedPicks } from "./picksCache";

/**
 * A week's picks workbook from the API, falling back to whatever this browser
 * cached from an earlier upload. Without the fallback, reopening a results URL
 * for a week that was only ever uploaded locally would find nothing.
 */
export default function loadStoredPicks(
  season: number,
  week: WeekInfo,
): Promise<ArrayBuffer> {
  return loadWeek(season, week.value);
}

async function loadWeek(
  season: number,
  weekNumber: number,
): Promise<ArrayBuffer> {
  try {
    const response = await fetch(`/api/picks/${season}/${weekNumber}`);
    if (response.status === 404) {
      throw new Error("Picks spreadsheet is missing from the picks store");
    }
    // Why the type is checked at all: see `contentType.ts`.
    if (!isContentType(response, XLSX_CONTENT_TYPE)) {
      throw new Error(
        `Picks response was ${contentTypeOf(response)}, not a spreadsheet`,
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer?.byteLength) {
      throw new Error("Empty picks buffer");
    }
    writeCachedPicks(season, weekNumber, arrayBuffer);
    return arrayBuffer;
  } catch (error) {
    const cached = readCachedPicks(season, weekNumber);
    if (cached != null) {
      return cached;
    }
    throw error;
  }
}

/** One slot, taken or dropped by the first scoring attempt after it. */
let prefetched: { key: string; picks: Promise<ArrayBuffer> } | undefined;

/**
 * Starts loading the week a results URL names, before the calendar that turns it
 * into a `WeekInfo` has arrived. A second call for the same week is a no-op.
 */
export function prefetchStoredPicks(season: number, weekNumber: number) {
  const key = `${season}:${weekNumber}`;
  if (prefetched?.key === key) return;
  const picks = loadWeek(season, weekNumber);
  // Read later, or never, so a failure here is not an unhandled rejection.
  picks.catch(() => {});
  prefetched = { key, picks };
}

/**
 * The prefetched picks for this week, if any. Empties the slot whatever week it
 * held, so a refresh or a later visit reads the sheet again.
 */
export function takePrefetchedPicks(
  season: number,
  week: WeekInfo,
): Promise<ArrayBuffer> | undefined {
  const taken = prefetched;
  prefetched = undefined;
  return taken?.key === `${season}:${week.value}` ? taken.picks : undefined;
}
