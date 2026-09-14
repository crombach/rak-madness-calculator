import type { Env } from "../env";
import { cachedGet, serviceUnavailable } from "../env";

/**
 * The browser keeps its copy and asks before every use of it. A week's picks are
 * rewritten when the sheet turns out to carry an error, and the URL for them never
 * changes, so reuse without asking is how a reader holds a corrected week's old
 * picks. `max-age=0` with `must-revalidate` is what makes a correction land on the
 * next read rather than once a timer runs out.
 *
 * The asking is cheap. `ETag` answers it with a 304 and no body, which costs the
 * round trip the reader was making anyway and none of the workbook. This route is
 * read once per week a reader selects, not once per paint.
 *
 * `s-maxage` holds the colo's own copy to a minute, which the browser ignores and
 * a shared cache does not. It catches a burst of first-time readers. A reader
 * already holding an `ETag` misses that copy and revalidates against R2 instead,
 * which `cachedGet` accounts for and leaves as it is.
 */
const CACHE_CONTROL = "public, max-age=0, s-maxage=60, must-revalidate";

/**
 * One week's picks workbook, from the season named by the `season` segment. A season
 * runs into the following January, so the 2025 season's week 18 was played in
 * January 2026 and is still filed under 2025.
 */
export const onRequestGet: PagesFunction<Env> = (context) =>
  cachedGet(context, () => readWeek(context));

async function readWeek(
  context: Parameters<PagesFunction<Env>>[0],
): Promise<Response> {
  const season = Number(context.params.season);
  const week = Number(context.params.week);
  if (!Number.isInteger(season) || !Number.isInteger(week)) {
    return new Response("Not Found", { status: 404 });
  }

  // Only this one header is set, rather than the request's own. R2 reads every
  // conditional in whatever it is handed, and the rest belong to requests this
  // route has no answer for.
  const conditional = new Headers();
  const ifNoneMatch = context.request.headers.get("If-None-Match");
  if (ifNoneMatch != null) {
    conditional.set("If-None-Match", ifNoneMatch);
  }

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
      // Keep in sync with XLSX_CONTENT_TYPE in src/utils/buildSpreadsheetBuffer.ts.
      // The Functions bundle separately and can't import it.
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=${season}-week-${week}-picks.xlsx`,
      ETag: spreadsheet.httpEtag,
      "Cache-Control": CACHE_CONTROL,
    },
  });
}
