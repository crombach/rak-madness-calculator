# src/utils

- `getLeagueInfo` / `getLeagueResults`: ESPN fetch, calendar, week mapping, and
  `getRegularSeasonWeekCount`, cached. A named season's answer is held five
  minutes. `espnScoreboardUrl` builds both URLs. The scoreboard request starts
  while the picks parse, except for a week the caller's `mayBeHeld` hint marks
  settled. `reuseWithinMs` takes a scoreboard answer that recent
- `buildSpreadsheetBuffer`: the xlsx export and its content type
- `pickStatusFill`: the export's pick and standing colors, held to the stylesheet
- `picksCache` / `espnCache` / `settledWeeksCache`: an uploaded workbook, ESPN's
  fixed answers, and which weeks settled, on `localStorageCache`, a capped store
  under one prefix
- `weekKey`: what a season's week is filed under
- `settingsStore`: the reader's own preferences, kept whatever the caches drop
- `loadStoredPicks`: a week's workbook from the API, or cache. `prefetchStoredPicks`
  starts a URL's week before the calendar lands
- `contentType`: what a response says it is, and why an `/api` path checks
- `debugLog`: scoring traces, silent outside a dev server
- `latestOnly`: drops an async result its effect outlived
- `cachedImport`: one shared import, forgotten once it fails
- `observeResize`: one ResizeObserver over several boxes, and its disposer
- `getClasses`: className join, fixed and conditional names
- `doNothing`: the no-op a default prop or context stands in with
- `onEnter`: a field's Enter as a submit, skipping an input method's Enter
- `plural`: a count and its noun, pluralized
- `separator`: what splits facts on one line, `_text.scss`'s `$separator` spaced
- `rangeWithPrefix`: labeled index arrays (C1, C2…)
- `matching`: case-folded substring search, for both dialogs' lists
- `readFileToBuffer`: an upload's bytes
- `lazyPreloadable`: a lazy route that can be fetched ahead, and skips its fallback once in
- `reloadForNewBuild`: reloads a tab whose chunk a deploy removed, at most every 10s
- `warmImage`: an image into the browser's cache, once, where prefetch does not reach

## Subdirectories

- [`scoring/`](scoring/CLAUDE.md) — pick results, player scores, knockouts
