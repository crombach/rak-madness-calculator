# footer

`Footer`: the home page's fixed-bottom row. A button opening `SettingsDialog`,
then links to Standings (rakmadness.net) and the GitHub repo. Each is marked
with an `Icon.tsx` icon rather than an emoji, so the mark is the same on every
platform and can be colored. Hidden below 540px viewport height, where the row
would sit under the home page's last button.

The settings pulse in the theme keys' lamp blue for a reader who has not opened
them lately. `Footer.tsx` stamps the moment they do, and weighs it against its
own `SETTINGS_CHANGED_AT`, so moving that forward sends everyone back to a dialog
that gained something. `Footer.scss` keeps the pulse lit rather than still under
reduced motion.
