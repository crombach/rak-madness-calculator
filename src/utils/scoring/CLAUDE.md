# scoring

The picks-to-scoreboard pipeline, sequenced by `getPlayerScores`.

- `parsePicksWorkbook`: xlsx buffer to rows, keys, matchups
- `parsePick`: a cell to team and spread
- `validateSpreads`: rows disagreeing on spread
- `marginAgainstSpread`: a side's margin, spread applied
- `getPickResults`: picks scored, plus `getStatus` and `fillStatus`, the status
  a cell is drawn by. One answer per cell
  text, held against the week's index
- `resultsIndex`: a week by team and by matchup, built once
- `leagueResults`: `fetchLeagueResults`, the named leagues fetched and the
  rest kept, and `hasMoved`, whether a fetch costs a rescore
- `gameColumns`: `LEAGUES`, `LEAGUE_PREFIX`, `gameLabels`
- `pickFor`: one player's cell for a game, by its label
- `weekGames`: each column, game and line
- `getTiebreakerScore`: the Monday night total
- `scorePlayers`: per-player totals, sorted
- `comparePlayerScores`: rank order, on merit, over a `Merit` the search
  fills from numbers
- `isWeekSettled`: whether every game is in, `isWeekWon`, whether it
  has a winner with games left or not, and `standingPlayers`, who can still win it
- `weekShape`: open games, holes, and whether the week ran out. One walk per
  set of rows
- `remainingGames`: the open games, and `countDifferences`, where two rows split
- `applyKnockouts`: who can still win, why not. A row under a shared name
  knocks nobody out
- `repeatedNames`: the names more than one row was entered under
- `scoreChanges`: what a refresh changed
- `getPlayerAnalysis`: what a player must do, plus `getSettledAnalysis`,
  the answers a week already holds, which the dialog asks before it waits,
  and `getMustWin`, the must-win games proven at n+1 verdicts, no search needed
- `getSwingGames`: those must-win games by game instead of by player, each side
  keyed by team, for the swing games page
- `leagueResultFixtures`: test game builders, and `weekOf`, one league's week
- `scoringTestFixtures`: player and week builders, shared by `getPlayerAnalysis`'s
  and `getSwingGames`'s tests
- `benchFixtures`: the 80x22 worst week the benchmarks measure, every game
  picked
