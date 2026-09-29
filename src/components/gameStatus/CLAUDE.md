# gameStatus

How a game in the week is going, opened from a pick cell.

- `GameStatusDialog`: `DialogShell` over a `DialogCombobox` of `scores.games`, in picks
  table order, which the query matches. `useLiveGame` polls its league.
- `GameMark`: the pill saying where a game stands, on the search and each card.
- `GameStatusSummary`: each side's `pickSplit` count and line, the reader's pick,
  both sides, kickoff, town, Gamecast link.
- `Scoreline`: the two scores, the state over, the down or outcome under.
  `outcomeClasses` colors a side, its score, the pool line's teams and the
  reader's pick alike.
- `gameStatusText`: the strings both read.
- `useScorelineFit`: takes the names, then the marks, off a narrow one.
- `GameStatusSummary.scss`: both sides in one grid, the dash in a track between two
  equal ones. `--rak-score-size` sizes it.
