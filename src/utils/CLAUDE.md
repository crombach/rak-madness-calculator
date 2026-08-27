# src/utils

- `getLeagueInfo` / `getLeagueResults`: ESPN fetch, calendar, week mapping,
  `getGameResult` by event id
- `getRegularSeasonWeekCount`: a season's week count, cached
- `buildSpreadsheetBuffer`: the xlsx export and its content type
- `pickStatusFill`: pick colors for the export
- `picksCache` / `espnCache`: an uploaded workbook, and ESPN's fixed answers,
  on `localStorageCache`, a capped store under one prefix
- `settingsStore`: the reader's own preferences, kept whatever the caches drop
- `loadStoredPicks`: a week's workbook from the API, or cache
- `debugLog`: scoring traces, silent outside a dev server
- `latestOnly`: drops an async result its effect outlived
- `getClasses`: className join, fixed and conditional names
- `doNothing`: the no-op a default prop or context stands in with
- `plural`: a count and its noun, pluralized
- `rangeWithPrefix`: labeled index arrays (C1, C2…)
- `matching`: case-folded substring search, shared by both dialogs' item lists
- `readFileToBuffer`: an upload's bytes
- `prefetchLink`: prefetch, no unused-preload console warning

## Subdirectories

- [`scoring/`](scoring/CLAUDE.md) — pick results, player scores, knockouts
