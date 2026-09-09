# picks

`PicksTable`: college/pro pick grid, a click opening the game status on the column the
cell sits in. Renders `PlayerName` per row, whose own click opens the player analysis
instead. Column labels via `rangeWithPrefix` (C1..., P1...), built once for the headers
and the cells, so neither can mean a game the other does not.

Each pick cell is a `PickCell`, the shared `.table__cell-button` carrying the status
fill. Right, wrong, and unscoreable picks (`--yes`, `--no`, `--unscoreable`) each get
a `PICK_STATUS_LABEL` entry as a `.table__sr-only` span, so a screen reader gets what
the color otherwise carries alone. `incomplete` has none: it draws no color either.

A cell the refresh resolved also renders a `.table__cell-wipe`, in the status it
left.
