# src/utils

- `getLeagueInfo` / `getLeagueResults`: ESPN fetch, calendar, week mapping,
  `getGameResult` by event id, and `getRegularSeasonWeekCount`, a season's week
  count, cached
- `buildSpreadsheetBuffer`: the xlsx export and its content type
- `pickStatusFill`: pick colors for the export
- `picksCache` / `espnCache`: an uploaded workbook, and ESPN's fixed answers,
  on `localStorageCache`, a capped store under one prefix
- `settingsStore`: the reader's own preferences, kept whatever the caches drop
- `loadStoredPicks`: a week's workbook from the API, or cache
- `contentType`: what a response says it is, and why an `/api` path checks
- `debugLog`: scoring traces, silent outside a dev server
- `latestOnly`: drops an async result its effect outlived
- `observeResize`: one ResizeObserver over several boxes, and its disposer
- `getClasses`: className join, fixed and conditional names
- `doNothing`: the no-op a default prop or context stands in with
- `plural`: a count and its noun, pluralized
- `rangeWithPrefix`: labeled index arrays (C1, C2…)
- `matching`: case-folded substring search, shared by both dialogs' item lists
- `readFileToBuffer`: an upload's bytes
- `warmImage`: an image into the browser's cache, once, where prefetch does not reach

## Subdirectories

- [`scoring/`](scoring/CLAUDE.md) — pick results, player scores, knockouts
