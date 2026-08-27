import { useId } from "react";
import { useNavigate } from "react-router";
import { Theme, useSettings } from "../../context/SettingsContext";
import Button from "../button/Button";
import Footer from "../footer/Footer";
import LogoButton, { APP_NAME } from "../navbar/LogoButton";
import PageLayout from "../pageLayout/PageLayout";
import "./SettingsPage.scss";

const THEMES: Array<{ value: Theme; label: string }> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "auto", label: "Auto" },
];

/** The `/settings` route: how the app looks, and who the reader is. */
export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme, playerName, setPlayerName } = useSettings();
  const nameInputId = useId();

  return (
    <PageLayout
      title={`${APP_NAME} Settings`}
      navbarLeft={<LogoButton onClick={() => navigate("/")} />}
    >
      <div className="settings">
        <section className="settings__section">
          <h2 className="settings__label">Appearance</h2>
          {/* Buttons that show which one is chosen, the same shape the navbar's
              own view switch is. Not a `radiogroup`, which wants `aria-checked`
              where `Button` gives `aria-pressed`. */}
          <div className="settings__choices" role="group" aria-label="Theme">
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
          <h2 className="settings__label">
            <label htmlFor={nameInputId}>Your name</label>
          </h2>
          <input
            id={nameInputId}
            className="settings__field"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="As it appears in the picks"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
          />
          <p className="settings__hint">
            Your row is marked in the scoreboard and the picks. Leave this empty
            to mark nothing.
          </p>
        </section>
      </div>

      <Footer />
    </PageLayout>
  );
}
