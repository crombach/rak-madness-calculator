# settings

`SettingsDialog`: the theme and the reader's own name, in the `DialogShell` the
player analysis and the game status use. Opened from the home page footer, which
is the only thing that opens it. Theme is three `Button`s with `selected`, the
navbar's own switch idiom, over `SettingsContext`. Your Player Name is an
`lcd-field` shell holding a text input and a clear button. Its value marks that
player's row in both tables.

`SettingsDialog.scss`: the column, its labels, and the well the field and its
clear button share. The well takes the focus ring, not the input.
