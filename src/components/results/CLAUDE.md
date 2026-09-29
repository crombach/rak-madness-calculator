# results

The week's results routes: `/:season/:week/scoreboard`, `/picks`, `/swings`,
`/games`, `/compare`.
`CurrentWeekRedirect` backs `/scoreboard` and `/picks`, redirecting to the latest
week worth showing.

- `resultsPath`: builds `/season/week/page` for each `RESULTS_PAGE`, the one place
  every route and nav link gets that URL.
- `ResultsLayout`: the layout route. Runs `useWeekRouteGuard`, keeps the URL and the
  selected page in step, and holds the navbar.
- `ScoreboardRoute`, `PicksRoute`: one table each, from context.
- `ResultsFrame`: the page and wireframe both `ResultsLayout` and
  `CurrentWeekRedirect` render into, captioned by its `ResultsPage` `view`. Holds
  both dialogs lazily, plus the table providers and `NavMenu`. `canRefresh` arms refresh
  and `pull` on a live week, off Games.
- `DialogLoadBoundary`: catches a dialog chunk a deploy replaced.
- `ResultsFrame.scss`: the column table and wireframe share, and the caption
  over both.
