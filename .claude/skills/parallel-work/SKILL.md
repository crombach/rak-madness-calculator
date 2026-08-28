---
name: parallel-work
description: Which parts of this repo are safe to edit at the same time. Read before splitting work across parallel agents, git worktrees, or subagents here, and before a change touching more than one module. Independent modules, shared state forcing serialization, known collision hotspots.
---

# Parallel work

One `package.json`, but two TypeScript roots. The root `tsconfig.json` excludes `functions/**/*`, `functions/tsconfig.json` covers the rest, and `package.json` runs `tsc` over each. So `src/` and `functions/` typecheck apart, and every remaining collision is file-level or port-level.

## Serialize these

- **`package.json` + `package-lock.json`** — one lockfile for the whole repo. Two agents adding dependencies in separate worktrees both rewrite it, and the merge conflicts every time. One agent owns dependency changes per branch.
- **`src/context/AppDataContext.tsx`** — the season list, the week list, picks, and scores for the whole app. Every data change passes through what it exposes, so two agents adding state both touch it.
- **Port 3000** — `vite.config.ts:7` defaults to it, and `strictPort` fails on a busy port rather than sliding to the next one. `make run PORT=3001` moves the dev server, so the second agent overrides instead of taking the default. `package.json`'s `pages:dev` hardcodes `--port 3000` and cannot move.

## Watch, don't serialize

- `src/components/button/` and `src/components/icon/` — the shared primitives. Every other component directory imports one or both, and neither imports anything.
- `src/components/dialog/` — backs `gameStatus/`, `playerAnalysis/`, and `settings/`.
- `src/appTestFixtures.tsx` and `src/weekFixtures.ts` — two fixture hotspots, not one. The three app-mounting suites at `src/` (`App.picks`, `App.routes`, `App.results`) share the first. The second was split out because the first mounts `App`, so `src/hooks/usePlayerScores.test.tsx` and `src/hooks/useWeekRouteGuard.test.tsx` cannot import it at all.
- `src/setupTests.ts` — 44 lines holding four concerns, not one import line: a raised `asyncUtilTimeout`, a `ResizeObserver` stub, a `matchMedia` stub, and the `jest` global shim.
- `src/index.scss` and `src/styles/_breakpoints.scss` — the design tokens and the breakpoint mixins. Small and append-mostly.
- `src/types/` — imported across `src/`, append-mostly, and rarely a conflict.
- Each `*.test.*` file pairs with one source file, so test work splits the way the source does. Two agents adding suites for different files do not collide.

## Safe in parallel

- `src/components/home/` and `src/components/toaster/` — nothing under `src/components/` imports either. `src/App.tsx` imports `home/`, and `src/index.tsx` and `src/appTestFixtures.tsx` import `toaster/`.
- `functions/api/picks/` — its own tsconfig and its own `tsc` pass. Nothing in `src/` touches it except the fetch URLs.
- `public/` — static assets.
- `src/hooks/` — one hook per file, and no hook imports another.
- `src/utils/scoring/` — one concern per file, though `getPlayerScores.ts` sequences the others, so a change to the pipeline's shape still touches it.
- `src/utils/` at the ends of its graph: `doNothing`, `getClasses`, `latestOnly`, `matching`, `plural`, `prefetchLink`, `readFileToBuffer`, `settingsStore`, and `warmImage`. Each imports nothing here, and nothing here imports it. `loadStoredPicks` and `getLeagueResults` sit at the top, imported by nothing here. The edges between: `loadStoredPicks` imports `buildSpreadsheetBuffer`, `contentType`, and `picksCache`. `getLeagueResults` imports `getLeagueInfo`, `debugLog`, and `espnCache`. `getLeagueInfo` imports `espnCache`. `espnCache` and `picksCache` both sit on `localStorageCache`. `buildSpreadsheetBuffer` imports `pickStatusFill` and `rangeWithPrefix`.

## Coupled, not safe

- `src/components/results/` — imports `gameStatus/`, `navbar/`, `pageLayout/`, `playerAnalysis/`, and `table/`. `src/components/home/HomePage.tsx` imports `results/resultsPath`, and `src/App.tsx` imports four of its route files.
- `src/components/settings/` — `footer/` imports it, so the theme and own-name dialog and the bottom links bar move together.
- `src/components/navbar/` — three `.tsx` and `.scss` pairs (`Navbar`, `ScoresNavbar`, `LogoButton`), not one. `pageLayout/` and `table/` both import it.
- `src/components/table/` — imports `table/playerName/`, and `playerAnalysis/` and `results/` import `table/`.
- `src/components/pageLayout/` — imported by `home/` and `results/`.
- `src/components/gameStatus/` and `src/components/playerAnalysis/` — each a dialog over `dialog/`, and `results/` mounts both.

## Cleared

- No shared `build/`-style output across worktrees. Each worktree gets its own `build/` and `node_modules/`.
- No `.env` files, no docker-compose services, no shared database.
- Host and port literals do exist in config. See Serialize these.
- `~/.npm` cache is lock-safe under concurrent `npm ci`.
