# button

`Button`: the app's only button, icon-only buttons included. Wraps Base UI's
unstyled `Button` and adds the `--solid`/`--soft` variants, the
`--primary`/`--success`/`--danger`/`--info`/`--warning` colors, `--sm`,
`--icon`, `--compact`, `selected`, and `busy`. Every prop is documented on the
component itself. `buttonClasses` builds the same className for a caller that
has to render a different element in the button's shape, such as `Menu.Trigger`.

`Button.scss` scopes every color rule to `:not(:disabled)` and every `:hover` to
`can-hover`, and takes its busy sheen from `styles/_skeleton.scss`.
