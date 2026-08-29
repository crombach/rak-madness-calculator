# context

- `AppDataContext`: the season list, week list, picks, and scores, held above the
  routes, with the season and week derived from the pathname. Publishes
  `WinnerDecidedContext` and `ScoreChangesContext` separately, the latter what a
  refresh just changed, for the tables to flash.
- `SettingsContext`: the theme and the reader's own name, from `settingsStore`.
  Writes `data-theme` for `index.scss`, and answers `useIsMyPlayer`.
- `ToastContext`: the toast list, split from its actions.
- `PlayerAnalysisContext`: how a player's name in a table opens the player analysis
  on them. One callback, a no-op with no provider above.
- `GameStatusContext`: the same, for a pick cell opening the game status on the
  column it sits in. Both single-callback contexts share their plumbing via
  `createCallbackContext`.
