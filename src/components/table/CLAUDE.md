# table

- `TableShell`: the frame both results tables share, the filler rows carrying a
  table to the bottom of the viewport, and the trailing row keeping the last real
  row clear of a phone's rounded corners. Takes `caption`, `busy`, `ariaHidden`,
  `standInRows`.
- `Table.scss`: the shared `.table` styles, sticky header and player column, touch
  feedback, striped rows, the trailing row, the `.table__cell-button` a clickable
  cell holds, and each column's width. Fixed, so a long value is cut short rather
  than widening it. `.table__cell-wipe` flashes a cell a refresh changed.
- `SkeletonTable`: the wireframe shown while a week is worked out. Its columns are
  the real ones' width, and its sixty-odd rows scroll as the table will.

## Subdirectories

- [`picks/`](picks/CLAUDE.md) — picks table, a cell opening its game
- [`playerName/`](playerName/CLAUDE.md) — name cell, shared status icon
- [`scores/`](scores/CLAUDE.md) — ranked score table, default view
