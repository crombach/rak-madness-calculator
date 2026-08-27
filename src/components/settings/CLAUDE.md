# settings

`SettingsPage`: the `/settings` route, reached from the home page footer, which
is the only page drawing that footer. A close button in the navbar leaves. Two
sections under a `Settings` heading. Theme is three `Button`s with `selected`, the navbar's own
switch idiom, over `SettingsContext`. Your Player Name is an `lcd-field` shell
holding a text input and a clear button. Its value marks that player's row in
both tables.

`SettingsPage.scss`: the column, its labels, and the well the field and its
clear button share. The well takes the focus ring, not the input.
