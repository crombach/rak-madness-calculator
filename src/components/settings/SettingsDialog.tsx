import { useId } from "react";
import { Theme, useSettings } from "../../context/SettingsContext";
import Button from "../button/Button";
import DialogShell from "../dialog/DialogShell";
import { CloseIcon } from "../icon/Icon";
import "./SettingsDialog.scss";

// Alphabetical, so the row has an order a reader can predict rather than one that
// ranks the choices.
const THEMES: Array<{ value: Theme; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

/** How the app looks, and who the reader is. */
export default function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { theme, setTheme, playerName, setPlayerName } = useSettings();
  const themeLabelId = useId();
  const nameInputId = useId();

  return (
    <DialogShell open={open} onOpenChange={onOpenChange} title="Settings">
      <div className="settings">
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
            Your row is marked in the scoreboard and picks tables.
          </p>
        </section>

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
            Auto mode honors your device settings.
          </p>
        </section>
      </div>
    </DialogShell>
  );
}
