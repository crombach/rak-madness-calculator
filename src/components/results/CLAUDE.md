# results

The week's results routes, `/:season/:week/scoreboard` and `/:season/:week/picks`.
`CurrentWeekRedirect` backs `/scoreboard` and `/picks`, redirecting to the latest
week worth showing.

- `resultsPath`: builds `/season/week/view`, the one place every route and nav
  link gets that URL.
- `ResultsLayout`: the layout route. Runs `useWeekRouteGuard`, keeps the URL and the
  selected week in step, and holds the navbar.
- `ScoreboardRoute` and `PicksRoute`: one table each, from context.
- `ResultsFrame`: the page and wireframe both `ResultsLayout` and
  `CurrentWeekRedirect` render into. Holds both dialogs, lazily, and the table
  providers. Its `useIsWinnerDecided` arms `ScoresNavbar`'s `isWeekLive` and
  `PageLayout`'s `pull` together.
- `DialogLoadBoundary`: catches a dialog chunk a deploy has replaced.
- `ResultsFrame.scss`: the column the table and the wireframe share, and the
  caption over both.
