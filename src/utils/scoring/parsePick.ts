/** A spread at the end of the cell, sign optional, space after the sign allowed. */
const trailingSpread = /([+-]?\s*\d+(?:\.\d+)?)\s*$/;

/**
 * A cell's team abbreviation and its spread, if it carries one.
 *
 * The spread is taken off the end and whatever is left is the abbreviation, rather
 * than reading the abbreviation up to the first space or sign. Abbreviations hold
 * both. `M-OH` has a hyphen and `OLE MISS` has a space, and looking for the first
 * one would cut either in half.
 *
 * These cells are typed by hand, so a spread with no sign is taken as written, and a
 * space after the sign is ignored. The abbreviation has to hold a letter, which is
 * what tells one from a spread nobody put a team in front of.
 */
export default function parsePick(pickString: string) {
  const cell = String(pickString ?? "").trim();
  const spread = trailingSpread.exec(cell);
  const abbreviation = (spread ? cell.slice(0, spread.index) : cell)
    .trim()
    // A cell written `BUF--7` leaves one behind, and no abbreviation ends in one.
    .replace(/-$/, "")
    .trim();
  return {
    // A blank cell reaches here as the string "undefined". It names no team, and a
    // matchup that took one for a team would never find its real game.
    teamAbbreviation:
      /[A-Za-z]/.test(abbreviation) && abbreviation !== "undefined"
        ? abbreviation.toUpperCase()
        : undefined,
    spread: spread != null ? Number(spread[1].replace(/\s+/g, "")) : 0,
  };
}

/**
 * The cell's own text, with a "+" put on a spread that was written with no sign,
 * so the underdog's number reads the same way the favorite's "-" already does.
 * A cell that already carries a sign, or names no team, is returned untouched.
 */
export function formatPickDisplay<T>(pickString: T): T | string {
  if (typeof pickString !== "string") return pickString;

  const match = trailingSpread.exec(pickString.trim());
  if (match == null || /^[+-]/.test(match[1].trim())) return pickString;

  const { teamAbbreviation, spread } = parsePick(pickString);
  if (teamAbbreviation == null || spread <= 0) return pickString;

  return `${teamAbbreviation} +${spread}`;
}
