import { EmojiEventsIcon, GitHubIcon } from "../icon/Icon";
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
    </div>
  );
}
