# results

The week's results routes: `/:season/:week/scoreboard`, `/picks`, `/swings`
and `/live`.
`CurrentWeekRedirect` backs `/scoreboard` and `/picks`, redirecting to the latest
week worth showing.

- `resultsPath`: builds `/season/week/page` for each `RESULTS_PAGE`, the one place
  every route and nav link gets that URL.
- `ResultsLayout`: the layout route. Runs `useWeekRouteGuard`, keeps the URL and the
  selected page in step, and holds the navbar.
- `ScoreboardRoute`, `PicksRoute`: one table each, from context.
- `ResultsFrame`: the page and wireframe both `ResultsLayout` and
  `CurrentWeekRedirect` render into, captioned by its `ResultsPage` `view`. Holds
  both dialogs, lazily, the table providers, and `NavMenu`. Its `useIsWeekSettled`
  arms `ScoresNavbar`'s `isWeekLive` and `PageLayout`'s `pull` together.
- `DialogLoadBoundary`: catches a dialog chunk a deploy has replaced.
- `ResultsFrame.scss`: the column the table and the wireframe share, and the
  caption over both.
