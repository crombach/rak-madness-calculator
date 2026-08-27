import { NavLink } from "react-router";
import { EmojiEventsIcon, GitHubIcon, SettingsIcon } from "../icon/Icon";
import "./Footer.scss";

export default function Footer() {
  return (
    <div className="footer">
      {/* The one link here that stays in the app, so a router link rather than
          an `<a>`: the others leave it, and a reload would cost the loaded week.
          `NavLink` over `Link` for the `aria-current` it sets on the page it is
          already on, which the stylesheet draws and a screen reader says. */}
      <NavLink className="footer__link" to="/settings">
        <SettingsIcon />
        Settings
      </NavLink>
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
    </div>
  );
}
