import { EmojiEventsIcon, GitHubIcon, MailIcon } from "../icon/Icon";
import "./Footer.scss";

const SUGGESTIONS_MAILTO = "mailto:rakulator@gmail.com";

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
      <a className="footer__link" href={SUGGESTIONS_MAILTO}>
        <MailIcon />
        Suggestions
      </a>
    </div>
  );
}
