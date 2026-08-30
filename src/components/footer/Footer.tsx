import { useState } from "react";
import { EmojiEventsIcon, GitHubIcon, SettingsIcon } from "../icon/Icon";
import SettingsDialog from "../settings/SettingsDialog";
import getClasses from "../../utils/getClasses";
import { PREFIX, readSetting, writeSetting } from "../../utils/settingsStore";
import "./Footer.scss";

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
const SETTINGS_CHANGED_AT = Date.parse("2026-08-30T00:00:00Z");

/**
 * Whether this reader has opened the settings since the last thing worth showing
 * them landed in it. An unset name, and a stored value no longer parseable, both
 * read as never.
 */
function hasSeenLatestSettings(): boolean {
  const seenAt = Date.parse(readSetting(SETTINGS_SEEN_SETTING) ?? "");
  return seenAt >= SETTINGS_CHANGED_AT;
}

export default function Footer() {
  const [isSettingsOpen, setSettingsOpen] = useState(false);

  // Only this stamp counts as having found the dialog. A reader with a theme or a
  // name already saved still gets the pulse, since neither of those was chosen
  // from here.
  const [hasSeenSettings, setSeenSettings] = useState(hasSeenLatestSettings);

  // Stamped on the way open rather than on the way closed, so the pulse stops as
  // the dialog appears instead of staying under it.
  function openSettings() {
    setSettingsOpen(true);
    setSeenSettings(true);
    writeSetting(SETTINGS_SEEN_SETTING, new Date().toISOString());
  }

  return (
    <div className="footer">
      {/* The one thing here that goes nowhere, so a button beside two links. The
          settings open over the page rather than replacing it, which is what the
          player analysis and the game status do too. */}
      <button
        type="button"
        className={getClasses("footer__link", {
          "footer__link--unseen": !hasSeenSettings,
        })}
        onClick={openSettings}
      >
        <SettingsIcon />
        Settings
      </button>
      |
      <a
        className="footer__link"
        href="https://rakmadness.net/standings-pickem"
        target="_blank"
        rel="noreferrer"
      >
        <EmojiEventsIcon />
        Standings
      </a>
      |
      <a
        className="footer__link"
        href="https://github.com/crombach/rak-madness-calculator"
        target="_blank"
        rel="noreferrer"
      >
        <GitHubIcon />
        GitHub
      </a>
      <SettingsDialog open={isSettingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
