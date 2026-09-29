# results

The week's results routes: `/:season/:week/scoreboard`, `/picks`, `/swings`,
`/all-games`, `/compare`.
`CurrentWeekRedirect` backs `/scoreboard` and `/picks`, redirecting to the latest
week worth showing.

- `resultsPath`: builds `/season/week/page`. `PAGES` holds each page's segment,
  table and menu-only flags. Every route and link reads it.
- `ResultsLayout`: the layout route. Runs `useWeekRouteGuard`, reads the page
  from the URL, holds the navbar.
- `ScoreboardRoute`, `PicksRoute`: one table each, from context.
- `ExperimentalGate`: sends a reader without the opt-in to the scoreboard.
- `ResultsFrame`: the page and wireframe both `ResultsLayout` and
  `CurrentWeekRedirect` render into, captioned by view and week. Holds both
  dialogs lazily and the table providers. `canRefresh` arms refresh and `pull`
  on a live week, off Games.
- `DialogLoadBoundary`: catches a dialog chunk a deploy replaced.
- `ResultsFrame.scss`: the column table and wireframe share, and the caption.
