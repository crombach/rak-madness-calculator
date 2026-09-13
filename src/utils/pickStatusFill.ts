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
  yes: { rgb: "A3FAA0" },
  no: { rgb: "FAA0A0" },
  unscoreable: { rgb: "FBD76A" },
  incomplete: { rgb: "FFFFFF" },
};
