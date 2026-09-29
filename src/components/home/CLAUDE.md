# home

`HomePage`: the `/` route. Season select above the week select, hidden picks file
input behind a button, View Results (navigates to the week's scoreboard), Export
Results, and the footer.
`LabeledSelect`: the Base UI select wrapper behind both pickers, used only here.
`LabeledSelect.scss` carries the selects' whole look, since Base UI ships them
unstyled. `HomePage.scss` sizes them and stacks the column.
