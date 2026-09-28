# Feature ideas

These are features worth building next. Each one reuses logic or components the
app already has. They are listed from the least work to the most.

## Head-to-head compare

Let a reader pick two players and show only the games where their picks differ.
Reuse the picks table with its rows filtered, and reuse `DialogCombobox` to pick
the players.

## Copy the standings

Add a button that copies the ranked scores as text, or shares them through the
Web Share API. Build the text from `RakMadnessScores` in the order
`comparePlayerScores` gives. The group chat then gets the standings without the
XLSX file.

## What-if mode

Let a reader set the result of each remaining game and see the standings change.
Pass the invented results to `getPlayerScores` as its `results` argument, in place
of the ESPN results. It applies the knockouts itself. The player analysis search in `getPlayerAnalysis` already
scores outcomes that have not happened yet. Look there first for a path to reuse.

## Swing games

For each remaining game, list the players it keeps alive or knocks out. Group the
`mustWin` games from `getPlayerAnalysis` by game instead of by player. This is a
list per game, not a second shares table.

The search runs once per player and stops at `MAX_SEARCHED_GAMES`, so time it on
a full week before you ship it.

## Season leaderboard

Total each player's weekly wins across the season. `functions/api/picks/index.ts`
already lists every stored week. Run `getPlayerScores` on each one and add up the
winners. This is the most work here, because it fetches ESPN results for every
week of the season.
