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

export function seasonsResponse(seasons: Array<number>): Response {
  return new Response(JSON.stringify({ seasons }), {
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
