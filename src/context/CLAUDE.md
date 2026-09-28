# context

- `AppDataContext`: the season list, week list, picks, and scores, held above the
  routes, season and week derived from the pathname. Publishes
  `WeekOutcomeContext`, whether the week is over or already won, and
  `ScoreChangesContext`, what the last refresh changed for the tables to flash,
  separately.
- `SettingsContext`: the theme, the reader's name, live analysis, and the
  experimental opt-in, from `settingsStore`. Writes `data-theme` for
  `index.scss`, and answers `useIsMyPlayer`.
- `ToastContext`: the toast list, split from its actions.
- `PlayerAnalysisContext`: how a name cell opens the player analysis on that
  player. One callback, a no-op with no provider above.
- `GameStatusContext`: the same, for a pick cell opening its game's status. Both
  single-callback contexts share plumbing via `createCallbackContext`.
