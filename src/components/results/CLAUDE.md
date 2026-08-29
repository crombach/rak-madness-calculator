# results

The week's results routes, `/:season/:week/scoreboard` and `/:season/:week/picks`.
`CurrentWeekRedirect` backs `/scoreboard` and `/picks` by redirecting to the latest
week worth showing.

- `resultsPath`: builds `/season/week/view`, the one place every route and nav
  link gets that URL.
- `ResultsLayout`: the layout route. Runs `useWeekRouteGuard`, keeps the URL and the
  selected week in step, and holds the navbar.
- `ScoreboardRoute` and `PicksRoute`: one table each, from context.
- `ResultsFrame`: the page and wireframe both `ResultsLayout` and
  `CurrentWeekRedirect` render into. Holds the app's `PlayerAnalysisDialog` and
  `GameStatusDialog` and both providers around the tables, and reads
  `useIsWinnerDecided` for `ScoresNavbar`'s `isWeekLive`.
- `ResultsFrame.scss`: the column the table and the wireframe are laid in, and the
  caption naming the week over both.
