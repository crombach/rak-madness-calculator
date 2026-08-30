# playerName

`PlayerName`: table cell (`<td>`) for one player, the name cut short with an
ellipsis rather than wrapped, so every row is one line tall.

Where `useShowPlayerStatus` says yes, it is a `.table__cell-button` holding the
name and `PlayerStatusIcon`, opening the player analysis through
`PlayerAnalysisContext`, with a `.table__sr-only` span carrying the words for the
fill color and a `.table__cell-wipe` over the fill a just-knocked-out player
held. Where it says no, it is the bare name under `--no-status`, which
`Table.scss` takes the fill and the hit area off.

`PlayerStatusIcon`: that icon alone, sized from `--rak-player-icon-size`. The
player analysis search renders it too.

`--mine`, from `useIsMyPlayer`, marks the reader's own either way, ruled in
`Table.scss` and lit like the navbar's lamp.
