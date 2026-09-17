import { XLSX_CONTENT_TYPE } from "./utils/buildSpreadsheetBuffer";

/**
 * Fetch response builders every suite uses.
 *
 * Held apart from `appTestFixtures`, which mounts `App` and so cannot be imported
 * by a suite that mocks `react-router` or a context provider out from under it.
 */

export function notFoundResponse(): Response {
  return new Response(null, { status: 404 });
}

export function htmlResponse(): Response {
  return new Response("<!doctype html><title>Rakulator</title>", {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}

/**
 * The picks index. `weeksBySeason` left out means no season has a week yet, which
 * is the case that falls through to ESPN's active week.
 */
export function seasonsResponse(
  seasons: Array<number>,
  weeksBySeason: Record<number, Array<number>> = {},
): Response {
  const body = {
    seasons: seasons.map((season) => ({
      season,
      // Sorted the way the route sends them, so a fixture listing them in any
      // order still exercises the newest week as the newest.
      weeks: [...(weeksBySeason[season] ?? [])].sort((a, b) => b - a),
    })),
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export function spreadsheetResponse(): Response {
  return new Response(new ArrayBuffer(8), {
    status: 200,
    headers: { "content-type": XLSX_CONTENT_TYPE },
  });
}
