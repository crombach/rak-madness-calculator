# Feature ideas

These are features worth building next. Each one reuses logic or components the
app already has. They are listed from the least work to the most.

## Navbar menu

Add a hamburger menu to the navbar for features that are not a view of one week.
Later features add an item to it. [`nav-menu.md`](nav-menu.md) holds the plan.

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

Show one table for the whole season, with a row per player and a column per week.
Each cell holds the player's points for that week, and a last column adds them up.
This is the most work here, because it scores every week of the season.
[`season-leaderboard.md`](season-leaderboard.md) holds the plan and what blocks it.
