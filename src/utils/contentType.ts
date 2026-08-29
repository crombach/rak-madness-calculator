/**
 * What a response says it is, and whether that is what a caller wanted.
 *
 * Worth checking on any `/api` path, because `make run` is a bare Vite dev server
 * with no Pages Function behind it, so it answers such a path with the app's own
 * HTML at 200. Reading the type keeps that page out of a parser expecting
 * something else, and lets the real fetch work against `npm run pages:dev`.
 */

export function contentTypeOf(response: Response): string {
  return response.headers.get("content-type") ?? "";
}

export function isContentType(response: Response, type: string): boolean {
  return contentTypeOf(response).startsWith(type);
}
