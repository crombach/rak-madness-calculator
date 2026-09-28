# home

`HomePage`: the `/` route. Season select above the week select, hidden picks file
input behind a button, View Results (navigates to the week's scoreboard), Export
Results, and the footer.
`LabeledSelect`: the Base UI select wrapper behind both pickers, and the nav
drawer's own season and week pair. `LabeledSelect.scss` carries the `.select__*`
look every caller shares, since Base UI ships a select unstyled.
