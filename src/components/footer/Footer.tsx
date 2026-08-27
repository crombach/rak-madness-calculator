import { Link } from "react-router";
import { EmojiEventsIcon, GitHubIcon, SettingsIcon } from "../icon/Icon";
import "./Footer.scss";

export default function Footer() {
  return (
    <div className="footer">
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
      |
      {/* The one link here that stays in the app, so a `Link` rather than an
          `<a>`: the others leave it, and a reload would cost the loaded week. */}
      <Link className="footer__link" to="/settings">
        <SettingsIcon />
        Settings
      </Link>
    </div>
  );
}
