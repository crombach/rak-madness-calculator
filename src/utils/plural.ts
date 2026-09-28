/**
 * A count and its noun, the noun taking an `s` unless the count is one. Every
 * noun the app counts is regular, so there is no irregular plural to carry.
 */
export default function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** A present-tense verb agreeing with a count: `needs` for one, `need` for more. */
export function verbFor(count: number, verb: string): string {
  return count === 1 ? `${verb}s` : verb;
}
