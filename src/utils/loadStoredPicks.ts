import { WeekInfo } from "../types/League";
import { XLSX_CONTENT_TYPE } from "./buildSpreadsheetBuffer";
import { contentTypeOf, isContentType } from "./contentType";
import { readCachedPicks, writeCachedPicks } from "./picksCache";

/**
 * A week's picks workbook from the API, falling back to whatever this browser
 * cached from an earlier upload. Without the fallback, reopening a results URL
 * for a week that was only ever uploaded locally would find nothing.
 */
export default async function loadStoredPicks(
  season: number,
  week: WeekInfo,
): Promise<ArrayBuffer> {
  try {
    const response = await fetch(`/api/picks/${season}/${week.value}`);
    if (response.status === 404) {
      throw new Error("Picks spreadsheet is missing from database");
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
    writeCachedPicks(season, week.value, arrayBuffer);
    return arrayBuffer;
  } catch (error) {
    const cached = readCachedPicks(season, week.value);
    if (cached != null) {
      return cached;
    }
    throw error;
  }
}
