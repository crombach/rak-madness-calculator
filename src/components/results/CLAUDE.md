# results

The week's results routes: `/:season/:week/scoreboard`, `/picks`, `/knockouts`,
`/games`, `/compare`.
`/scoreboard` and `/picks` render `ResultsLayout` with `shortcutView`, and
`CurrentWeekRedirect` beside its frame sends them to the latest week worth showing.

- `resultsPath`: builds `/season/week/page`. `PAGES` holds each page's segment,
  table and menu-only flags. Every route and link reads it.
- `ResultsLayout`: the layout route. Runs `useWeekRouteGuard`, reads the page
  from the URL, holds the navbar.
- `ScoreboardRoute`, `PicksRoute`: one table each, from context.
- `ExperimentalGate`: sends a reader without the opt-in to the scoreboard.
- `ResultsRedirect`: a page's redirect, drawing the destination's wireframe.
- `ResultsFrame`: the page and wireframe `ResultsLayout` renders into, memoized, captioned by view and week. Holds both
  dialogs lazily and the table providers. A failed week gets Retry and Home. A lazy page's wireframe stays until its code
  is in too, so it mounts once. `canRefresh` arms refresh and `pull`
  on a live week, off the card pages.
- `DialogLoadBoundary`: catches a dialog chunk a deploy replaced.
- `ResultsFrame.scss`: the column table and wireframe share, the caption.
