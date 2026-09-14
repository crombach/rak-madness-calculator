# public

Vite copies these to the build root as they are. `index.html` at the repo root
names them by absolute path.

- `manifest.json`: the installed app, called Rakulator, standalone, and its icons
- `favicon.ico`, `logo192.png`, `logo512.png`: the icons the manifest and the
  shell point at
- `robots.txt`: denies every crawler, because a private pool's results are not
  for one
- `_headers`: Cache-Control for `/assets/` and `/fonts/`, read by Pages
- `fonts/`: the logo's face and the body face at four weights, which paint before
  anything else. Copied out of `@fontsource` so `index.html` can preload them by a
  name it knows, and its comment says why. To change one, update the package, then
  copy its `files/<family>-latin-<weight>-normal.woff2` here under the short name.
