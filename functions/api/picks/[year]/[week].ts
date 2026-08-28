import type { Env } from "../env";
import { serviceUnavailable } from "../env";

/**
 * An hour of reuse, then the browser asks whether its copy still stands. A week's
 * picks are rewritten when the sheet turns out to carry an error, and the URL for
 * them never changes, so a copy that can outlive a correction has to be able to
 * find out about one.
 */
const CACHE_CONTROL = "public, max-age=3600, must-revalidate";

/**
 * One week's picks workbook, from the season named by the `year` segment. A season
 * runs into the following January, so the 2025 season's week 18 was played in
 * January 2026 and is still filed under 2025.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const season = Number(context.params.year);
  const week = Number(context.params.week);
  if (!Number.isInteger(season) || !Number.isInteger(week)) {
    return new Response("Not Found", { status: 404 });
  }

  // Only this one header, rather than the request's own: R2 reads every
  // conditional in whatever it is handed, and the rest belong to requests this
  // route has no answer for.
  const conditional = new Headers();
  const ifNoneMatch = context.request.headers.get("If-None-Match");
  if (ifNoneMatch != null) {
    conditional.set("If-None-Match", ifNoneMatch);
  }

  // Get the spreadsheet from R2.
  const filePath = `picks/${season}/${week}.xlsx`;
  let spreadsheet;
  try {
    spreadsheet = await context.env.RAK_MADNESS_BUCKET.get(filePath, {
      onlyIf: conditional,
    });
  } catch (error) {
    return serviceUnavailable("Failed to fetch picks", error);
  }
  if (!spreadsheet) {
    return new Response("Not Found", { status: 404 });
  }

  // R2 answers a condition it did not meet with the object and no body, which is
  // what says the caller's copy is the current one.
  if (!("body" in spreadsheet)) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: spreadsheet.httpEtag,
        "Cache-Control": CACHE_CONTROL,
      },
    });
  }

  return new Response(spreadsheet.body, {
    status: 200,
    headers: {
      // Keep in sync with XLSX_CONTENT_TYPE in src/utils/buildSpreadsheetBuffer.ts;
      // the Functions bundle separately and can't import it.
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=${season}-week-${week}-picks.xlsx`,
      ETag: spreadsheet.httpEtag,
      "Cache-Control": CACHE_CONTROL,
    },
  });
};
