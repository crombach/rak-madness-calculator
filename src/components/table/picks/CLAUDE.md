# picks

`PicksTable`: college/pro pick grid. A click on a pick cell or its column heading
opens that game's status. `PlayerName` per row opens the player analysis instead.
Column labels via `rangeWithPrefix` (C1..., P1...), built once for headers and
cells, so the two cannot disagree.

Each pick cell is a `PickCell`, the shared `.table__cell-button` carrying the status
fill. Right, wrong, and unscoreable picks each get a `PICK_STATUS_LABEL` entry as a
`.table__sr-only` span, saying what the color alone carries.
`incomplete` has none: it draws no color either.

A cell the refresh resolved renders a `.table__cell-wipe`, in the status it left.
`HEADING_MARK` gives a live game's heading a `.table__live-dot` and a delayed one a
`.table__delay-icon`, each beside a `.table__sr-only` word every cell inherits.
