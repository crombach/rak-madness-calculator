# context

- `AppDataContext`: the season list, week list, picks, and scores, held above the
  routes, season and week from the pathname. Read by `useCalendar`, `useScores`,
  and `useScoringStatus` (flags, refresh), so a poll's flags skip the tables.
  `WeekOutcomeContext` and `ScoreChangesContext` split off likewise.
  `KnockoutsContext` runs `getKnockouts` once per scores, read by `useKnockouts`.
- `SettingsContext`: theme, name, live analysis, beta opt-in, outside React.
  `useSetting(key)` renders on that setting only, `useSettings()` on any, so
  the dialog alone uses it. Writes `data-theme`, answers `useIsMyPlayer`.
- `experimentalFeaturesOffered`: whether βeta Mode is offered.
- `experimentalFeaturesOfferedMock`: its test stand-in.
- `ToastContext`: the toast list, split from its actions.
- `PlayerAnalysisContext`: how a name cell opens the player analysis on that
  player. One callback, a no-op with no provider above.
- `GameStatusContext`: the same, for a pick cell opening its game's status. Both
  single-callback contexts share plumbing via `createCallbackContext`.
