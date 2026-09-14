# fonts

The faces that paint before anything else, so `index.html` declares and preloads
them itself rather than wait on the bundle. Its comment says why. Copies at fixed
paths, since that file cannot know the hashed name Vite emits.

- `dseg14-classic-700.woff2`: the logo, a wordmark drawn as a segment display. A
  swap into it is the whole logo changing shape.
- `chakra-petch-<weight>.woff2`: the body face at 400, 500, 600 and 700. Narrower
  than the system stack behind it, so a swap moves every label under it.

Each comes from its `@fontsource` package, out of
`files/<family>-latin-<weight>-normal.woff2`. The latin cut alone, since the
family also carries Thai or Cyrillic. To change one, update the package and copy
it again.
