# home

`HomePage`: the `/` route. Season select above the week select, hidden picks file
input behind a button, View Results (navigates to the week's scoreboard), Export
Results, and the footer.
`LabeledSelect`: the Base UI select wrapper behind both pickers, used only here.
`HomePage.scss` carries the season and week selects' whole look, since Base UI
ships them unstyled. Both share the same `.select__*` classes, still there rather
than in `LabeledSelect.tsx`.
