import { Status } from "../types/RakMadnessScores";

/**
 * The fill behind a pick, by whether it scored.
 *
 * The same colors the browser draws these statuses in, which come from the success,
 * danger, and warning ramps in `src/index.scss`. The two cannot share one value.
 * This side needs bare hex for xlsx, and the stylesheet needs a CSS color. The suite
 * beside this file is what holds them together.
 */
export const PICK_STATUS_FILL: Record<Status, { rgb: string }> = {
  yes: { rgb: "89FF85" },
  no: { rgb: "FF8585" },
  unscoreable: { rgb: "FFD83D" },
  incomplete: { rgb: "FFFFFF" },
};

/** Where a player stands, as the name cell in front of their picks is filled. */
export type PlayerStanding =
  "inContention" | "knockedOut" | "nameConflict" | "noStatus";

/**
 * The fill behind a player's name, by where they stand.
 *
 * Read off the light-mode tokens the same way `PICK_STATUS_FILL` is, since a
 * workbook has no reader and no theme to follow. `nameConflict` takes the
 * unscoreable pick's own fill, the way the tables do: neither is a standing, and
 * both say the sheet needs fixing rather than anything the week did.
 */
export const PLAYER_STATUS_FILL: Record<PlayerStanding, { rgb: string }> = {
  inContention: { rgb: "85D2FF" },
  knockedOut: { rgb: "FFBE85" },
  nameConflict: { rgb: "FFD83D" },
  noStatus: { rgb: "FFFFFF" },
};
