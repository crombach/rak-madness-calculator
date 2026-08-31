# Rakulator

Simple auto-scoring web application for [Rak Madness](https://rakmadness.net/). The [public site](https://rak.cullenrombach.com/) is hosted on [CloudFlare Pages](https://developers.cloudflare.com/pages/).

Results are viewable on the web and can be exported to an XLSX spreadsheet.

Uses [the hidden ESPN API](https://gist.github.com/akeaswaran/b48b02f1c94f873c6655e7129910fc3b) to fetch game results, and consumes the weekly Rak Madness spreadsheet to do auto-scoring.
Spreadsheets provided by Rak may require some cleanup before they can be parsed, though an effort has been made to standardize on the ESPN team abbreviations.

Here is a [spreadsheet for team abbreviations](https://docs.google.com/spreadsheets/d/1qPdaaXTtnA33izapArCRN--BTNYb-Q0GwhhycJ4dx3w/edit?usp=drivesdk) in both the NFL and NCAA.
Here is a link to [the Google Drive folder containing historical picks and scores spreadsheets](https://drive.google.com/drive/folders/1oHVWKoAbDtT2vJLU3yBP9ofEOPEzNrqi?usp=sharing).

This was thrown together using KISS principles for a small, family-and-friends football pool. It is not intended for public (or at-scale) use and, as such, should not be judged too harshly.

## Development

Built with [Vite](https://vite.dev/), React 19, TypeScript, [react-router](https://reactrouter.com/), and [Base UI](https://base-ui.com/).

Picks come from `/api/picks/<season>/<week>` first, then from a cache of anything uploaded in that browser for that season and week. A week with no picks either way sends you home with an explanation. Requires the Node version `.nvmrc` pins, `v22.23` or a later 22.x. Run `nvm use` first.

```
make setup      # install dependencies from the lockfile
make run        # dev server on http://localhost:3000 (make run PORT=3001 to move it)
make build      # typecheck, then production build into ./build
make test       # Vitest, once, no watch mode
make bench      # the scoring benchmarks, which make check leaves out
make check      # lint, lint-docs, typecheck, test, then a prettier format check
make lint       # ESLint over the repo
make lint-docs  # the CLAUDE.md tree: structure, duplication, length
make typecheck  # tsc --noEmit, src/ and functions/ separately
make format     # eslint --fix, then prettier
```

`make help` lists every target.

`npm run pages:dev` builds first, then serves `./build` through wrangler on port 3000. Use it to exercise the Cloudflare side; use `make run` for hot reload. The `/api/picks` route lists the seasons that have picks, and `/api/picks/<season>/<week>` reads `picks/<season>/<week>.xlsx` from the `RAK_MADNESS_BUCKET` binding declared in `wrangler.toml`. Locally that bucket is simulated and starts empty, so both routes come back empty or 404 and the app falls back to manual spreadsheet upload. `wrangler.toml` carries the command that seeds it.

## Deploying

Cloudflare Pages builds from git on its own, using the build settings in the
Cloudflare dashboard. Push to `main` for production, push any other branch for a
preview. wrangler is here for local testing only, so there is deliberately no
deploy script to run.
