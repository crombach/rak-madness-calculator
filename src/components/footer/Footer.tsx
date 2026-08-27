import { useState } from "react";
import { EmojiEventsIcon, GitHubIcon, SettingsIcon } from "../icon/Icon";
import SettingsDialog from "../settings/SettingsDialog";
import "./Footer.scss";

export default function Footer() {
  const [isSettingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="footer">
      {/* The one thing here that goes nowhere, so a button beside two links. The
          settings open over the page rather than replacing it, which is what the
          player analysis and the game status do too. */}
      <button
        type="button"
        className="footer__link"
        onClick={() => setSettingsOpen(true)}
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
