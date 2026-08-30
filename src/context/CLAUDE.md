# context

- `AppDataContext`: the season list, week list, picks, and scores, held above the
  routes, season and week derived from the pathname. Publishes
  `WinnerDecidedContext` and `ScoreChangesContext` separately, the latter what a
  refresh just changed, for the tables to flash.
- `SettingsContext`: the theme, the reader's own name, and whether a live week
  says where players stand, from `settingsStore`. Writes `data-theme` for
  `index.scss`, and answers `useIsMyPlayer`.
- `ToastContext`: the toast list, split from its actions.
- `PlayerAnalysisContext`: how a name cell opens the player analysis on that
  player. One callback, a no-op with no provider above.
- `GameStatusContext`: the same, for a pick cell opening its game's status. Both
  single-callback contexts share plumbing via `createCallbackContext`.
