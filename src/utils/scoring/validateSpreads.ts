import parsePick from "./parsePick";

/**
 * The games whose rows disagree about the spread, mapped to the disagreement.
 *
 * A spread describes the game, not the player who picked it. Two rows on the same
 * side of a game carry the same spread, and two rows on opposite sides carry
 * opposite ones. A sheet that breaks that has a typo in it, and nothing here can
 * tell which of the two numbers was meant, so the game cannot be scored for
 * anybody.
 */
export default function findInconsistentSpreadGames(
  rows: Array<any>,
  gameKeys: Array<string>,
): Map<string, string> {
  const inconsistent = new Map<string, string>();

  gameKeys.forEach((gameKey) => {
    let reference: { pick: string; team: string; spread: number } | undefined;

    for (const row of rows) {
      const cell = row[gameKey];
      if (!cell) continue;
      const { teamAbbreviation, spread } = parsePick(cell);
      if (teamAbbreviation == null) continue;

      if (reference == null) {
        reference = { pick: cell, team: teamAbbreviation, spread };
        continue;
      }
      // Restated from the reference row's side, so both readings of a consistent
      // sheet come out as the same number.
      const spreadFromReferenceSide =
        teamAbbreviation === reference.team ? spread : -spread;
      if (spreadFromReferenceSide !== reference.spread) {
        inconsistent.set(
          gameKey,
          `Picks disagree about the spread: "${reference.pick}" and "${cell}".`,
        );
        break;
      }
    }
  });

  return inconsistent;
}
