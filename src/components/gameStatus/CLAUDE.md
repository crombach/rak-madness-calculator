# gameStatus

How a game in the week is going, opened from a pick cell.

- `GameStatusDialog`: `DialogShell` over a `DialogCombobox` of `scores.games`, in picks
  table order, which the query matches. `markFor` says where a game stands,
  `useLiveGame` polls its league.
- `GameStatusSummary`: `SpreadLine`, both sides, kickoff, town, Gamecast link.
  `brief` drops the line and that strip.
- `Scoreline`: the two scores, the state over, the down or outcome under.
  `outcomeClasses` colors a side and its score alike.
- `gameStatusText`: the strings both read.
- `useScorelineFit`: takes the names, then the marks, off a narrow one.
- `GameStatusSummary.scss`: both sides in one grid, the dash in a track between two
  equal ones. `--rak-score-size` sizes it.
