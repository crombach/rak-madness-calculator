/** When a final game ended, and when it kicked off. */
export type Finish = { finishedAt?: Date | null; kickoff?: Date };

/** A date's time, or `undefined` for no date or one that does not parse. */
export function validTime(date: Date | null | undefined): number | undefined {
  const at = date?.getTime();
  return at != null && Number.isFinite(at) ? at : undefined;
}

function keyOf({ finishedAt, kickoff }: Finish) {
  const end = validTime(finishedAt);
  return end == null
    ? { hasFinish: false, at: validTime(kickoff) ?? Infinity }
    : { hasFinish: true, at: end };
}

/**
 * Orders final games earliest to end first. A game with no finish from ESPN goes
 * after every game with one, by kickoff, since a kickoff is hours earlier
 * than any finish. A game with no time at all goes last. A tie is 0, for the
 * caller to break.
 */
export default function compareFinish(a: Finish, b: Finish): number {
  const [x, y] = [keyOf(a), keyOf(b)];
  // Compared, not subtracted: two games with no time are both Infinity.
  return (
    Number(y.hasFinish) - Number(x.hasFinish) ||
    Number(x.at > y.at) - Number(x.at < y.at)
  );
}
