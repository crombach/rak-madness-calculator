# picks

Two GET routes under `/api/picks`, both reading the `RAK_MADNESS_BUCKET` R2
binding. The bracketed file names are Pages placeholders, part of the path.

- `index.ts`: the seasons that have picks, newest first, listed off the bucket
  rather than written down, so a new season appears with its first upload
- `[season]/[week].ts`: one week's xlsx as a download, ETag revalidated, because
  a corrected sheet keeps the URL the browser already cached
- `env.ts`: the `Env` type, the 503 helper, and `cachedGet`, which caches both
  routes per colo at each route's own `Cache-Control`. Cloudflare caches a
  Function's JSON or xlsx only when asked, so without it every request cost an
  R2 round trip.
