import { useId } from "react";
import { useNavigate } from "react-router";
import { Theme, useSettings } from "../../context/SettingsContext";
import Button from "../button/Button";
import { CloseIcon } from "../icon/Icon";
import LogoButton, { APP_NAME } from "../navbar/LogoButton";
import PageLayout from "../pageLayout/PageLayout";
import "./SettingsPage.scss";

// Alphabetical, so the row has an order a reader can predict rather than one that
// ranks the choices.
const THEMES: Array<{ value: Theme; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

/** The `/settings` route: how the app looks, and who the reader is. */
export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme, playerName, setPlayerName } = useSettings();
  const themeLabelId = useId();
  const nameInputId = useId();

  return (
    <PageLayout
      title={`${APP_NAME} Settings`}
      navbarLeft={<LogoButton onClick={() => navigate("/")} />}
      /* The way out. The logo goes home from every page, but nothing on this one
         says so, and a page of preferences reads as something a reader closes. */
      navbarRight={
        <Button
          iconOnly
          ariaLabel="Close settings"
          onClick={() => navigate("/")}
        >
          <CloseIcon />
        </Button>
      }
    >
      <div className="settings">
        <h2 className="settings__title">Settings</h2>
        <section className="settings__section">
          <h3 className="settings__label" id={themeLabelId}>
            Theme
          </h3>
          {/* Buttons that show which one is chosen, the same shape the navbar's
              own view switch is. Not a `radiogroup`, which wants `aria-checked`
              where `Button` gives `aria-pressed`. Named by the heading above it
              rather than by a label of its own, which would say `Theme` twice. */}
          <div
            className="settings__choices"
            role="group"
            aria-labelledby={themeLabelId}
          >
            {THEMES.map(({ value, label }) => (
              <Button
                key={value}
                compact
                selected={theme === value}
                onClick={() => setTheme(value)}
                className="settings__choice"
              >
                {label}
              </Button>
            ))}
          </div>
          <p className="settings__hint">
            Auto follows whatever your device is set to.
          </p>
        </section>

        <section className="settings__section">
          <h3 className="settings__label">
            <label htmlFor={nameInputId}>Your Player Name</label>
          </h3>
          {/* The well is the shell rather than the input, so the clear button
              sits inside it in a bay of its own, the way the home page's selects
              hold their chevron. */}
          <div className="settings__field">
            <input
              id={nameInputId}
              className="settings__field-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="As it appears in the picks"
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
            />
            {/* Nothing to clear while the field is empty, and a button that does
                nothing is one more thing to tab past. */}
            {playerName !== "" && (
              <button
                type="button"
                className="settings__field-clear"
                aria-label="Clear your player name"
                onClick={() => setPlayerName("")}
              >
                <CloseIcon />
              </button>
            )}
          </div>
          <p className="settings__hint">
            Your row is marked in the scoreboard and the picks. Leave this empty
            to mark nothing.
          </p>
        </section>
      </div>
    </PageLayout>
  );
}
