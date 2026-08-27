# playerName

`PlayerName`: table cell (`<td>`) holding a `.table__cell-button` with the player
name and status icon. Click opens the player analysis on that player, through
`PlayerAnalysisContext`. Name is cut short with an ellipsis rather than wrapped, so
every row is one line tall. A `.table__sr-only` span carries the words for the fill
color.

`PlayerStatusIcon`: that icon on its own, sized from `--rak-player-icon-size`. The
player analysis search renders it too, so the same player wears the same icon in
both places.

`--mine`, from `useIsMyPlayer`, marks the reader's own. `Table.scss` reads it
off the row and rules every cell above and below.

A player a refresh just knocked out renders a `.table__cell-wipe`, from
`useScoreChanges()`, over the fill they held before that.
