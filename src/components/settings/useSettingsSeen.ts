import { useState } from "react";
import { PREFIX, readSetting, writeSetting } from "../../utils/settingsStore";

const SETTINGS_SEEN_SETTING = "settingsSeenAt";

/** Composed here for a test that reads localStorage directly. */
export const SETTINGS_SEEN_KEY = PREFIX + SETTINGS_SEEN_SETTING;

/**
 * When the settings last gained something worth being sent back for. A reader who
 * opened the dialog before this has not seen what is in it now, so the pulse
 * starts over for them. Move it forward on the same commit that adds the thing,
 * and leave it alone for a change nobody would go looking for.
 *
 * A reader who opens the dialog stores the moment they did. That is what makes
 * this comparable rather than a flag that can only be set once.
 */
const SETTINGS_CHANGED_AT = Date.parse("2026-09-28T21:00:00Z");

/**
 * Whether this reader has opened the settings since the last thing worth showing
 * them landed in it. An unset name, and a stored value no longer parseable, both
 * read as never.
 */
function hasSeenLatestSettings(): boolean {
  const seenAt = Date.parse(readSetting(SETTINGS_SEEN_SETTING) ?? "");
  return seenAt >= SETTINGS_CHANGED_AT;
}

/**
 * Whether the settings control should stop pulsing, and the call that stamps the
 * dialog seen. Call it as the dialog opens rather than as it closes, so the pulse
 * stops as the dialog appears instead of staying under it.
 */
export default function useSettingsSeen(): [boolean, () => void] {
  // Only this stamp counts as having found the dialog. A reader with a theme or a
  // name already saved still gets the pulse, since neither was chosen from here.
  const [hasSeen, setSeen] = useState(hasSeenLatestSettings);
  function markSeen() {
    setSeen(true);
    writeSetting(SETTINGS_SEEN_SETTING, new Date().toISOString());
  }
  return [hasSeen, markSeen];
}
