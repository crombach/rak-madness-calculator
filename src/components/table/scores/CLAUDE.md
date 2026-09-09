# scores

`ScoresTable`: memoized ranked results table. Renders nothing without scores.
Columns: rank, `PlayerName` cell, MNF pick and distance, college/pro/ATS/total scores.
Its `TableShell` caption is the table's own accessible name: "Player rankings for
the week, by total score". Visually hidden, since the page around it already
says what week this is.
