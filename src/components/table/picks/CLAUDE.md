# picks

`PicksTable`: college/pro pick grid. A click on a pick cell or its column heading
opens that game's status. `PlayerName` per row opens the player analysis instead.
Column labels via `rangeWithPrefix` (C1..., P1...), built once for headers and
cells, so neither can mean a game the other does not.

Each pick cell is a `PickCell`, the shared `.table__cell-button` carrying the status
fill. Right, wrong, and unscoreable picks each get a `PICK_STATUS_LABEL` entry as a
`.table__sr-only` span, saying what the color alone carries.
`incomplete` has none: it draws no color either.

A cell the refresh resolved renders a `.table__cell-wipe`, in the status it left. A live
game marks its heading with a `.table__live-dot` and a `.table__sr-only` word every
cell inherits.
