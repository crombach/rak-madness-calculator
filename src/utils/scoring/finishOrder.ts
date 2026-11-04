/** When a final game ended, and when it kicked off. */
export type Finish = { finishedAt?: Date | null; kickoff?: Date };

/** A date's time, or `missing` for no date or one that does not parse. */
export function timeOr(date: Date | null | undefined, missing: number): number {
  const at = date?.getTime();
  return at != null && Number.isFinite(at) ? at : missing;
}

function keyOf({ finishedAt, kickoff }: Finish) {
  const end = timeOr(finishedAt, NaN);
  return Number.isNaN(end)
    ? { hasFinish: false, at: timeOr(kickoff, Infinity) }
    : { hasFinish: true, at: end };
}

/**
 * Orders final games earliest to end first. A game with no finish from ESPN goes
 * after every game with one, by kickoff, since its end is still to read. A game
 * with no time at all goes last. A tie is 0, for the caller to break.
 */
export default function compareFinish(a: Finish, b: Finish): number {
  const [x, y] = [keyOf(a), keyOf(b)];
  // Compared, not subtracted: two games with no time are both Infinity.
  return (
    Number(y.hasFinish) - Number(x.hasFinish) ||
    Number(x.at > y.at) - Number(x.at < y.at)
  );
}
