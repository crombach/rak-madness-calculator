# settings

`SettingsDialog`: settings in the `DialogShell` the player analysis and the
game status use. Only `NavMenu`'s Settings item opens it. Player Name comes first: an `lcd-field` shell holding a text input and
a clear button, whose value marks that player's row in both tables. Live Player
Analysis, Theme, and Experimental Features follow, each a row of `Button`s
with `selected`, the navbar's own switch idiom. All of them go through
`SettingsContext`. A new one means moving `SETTINGS_CHANGED_AT` forward.

`SettingsDialog.scss`: the column, its labels, and the well the field and its
clear button share. The well takes the focus ring, not the input.

`useSettingsSeen`: whether the reader opened the dialog since its
`SETTINGS_CHANGED_AT`. Drives `NavMenu`'s Settings pulse.
