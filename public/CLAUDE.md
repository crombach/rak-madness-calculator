# public

Vite copies these to the build root as they are. `index.html` at the repo root
names them by absolute path.

- `manifest.json`: the installed app, called Rakulator, standalone, and its icons
- `favicon.ico`, `logo192.png`, `logo512.png`: the icons the manifest and the
  shell point at
- `robots.txt`: denies every crawler, because a private pool's results are not
  for one
- `fonts/dseg14-classic-700.woff2`: the logo's face, copied from
  `@fontsource/dseg14-classic` 5.3.0. Here rather than bundled, so `index.html`
  can name a path Vite does not hash and preload it before the first paint.
  To change it, update the package, then copy
  `node_modules/@fontsource/dseg14-classic/files/dseg14-classic-latin-700-normal.woff2`
  here under this name.
