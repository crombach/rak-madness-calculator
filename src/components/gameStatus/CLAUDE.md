# gameStatus

How a game in the week is going, opened from a pick cell.

- `GameStatusDialog`: `DialogShell` over a `DialogCombobox` of `scores.games`, in picks
  table column order, which the query matches. `GameMark` says where a game stands.
  `useLiveGame` keeps the chosen one fresh.
- `GameStatusSummary`: the pool's line, the game as ESPN's boxscore says it, its kickoff,
  town and Gamecast link. The week's own copy is up from the first render, and a fetched
  answer replaces it in place, so nothing waits. `useScorelineFit` takes the full names,
  then the marks, off one too narrow.
- `GameStatusSummary.scss`: both sides in one grid, the dash in a track between two
  equal ones, so neither side moves it. `--rak-score-size` sizes that row.
