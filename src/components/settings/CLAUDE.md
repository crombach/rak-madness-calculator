# settings

`SettingsDialog`: three settings in the `DialogShell` the player analysis and the
game status use. Opened from the home page footer, which is the only thing that
opens it. Player Name comes first: an `lcd-field` shell holding a text input and
a clear button, whose value marks that player's row in both tables. Live Player
Analysis and Theme follow, each a row of `Button`s with `selected`, the navbar's
own switch idiom. All three go through `SettingsContext`. A new one
means moving `Footer.tsx`'s `SETTINGS_CHANGED_AT` forward.

`SettingsDialog.scss`: the column, its labels, and the well the field and its
clear button share. The well takes the focus ring, not the input.
