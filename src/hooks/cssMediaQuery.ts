/** The media query `index.scss` exports under the given `--rak-*` custom property. */
export default function cssMediaQuery(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
    .replace(/^"|"$/g, "");
}
