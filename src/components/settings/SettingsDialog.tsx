import { useId, useRef } from "react";
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

// The on choice first, against the alphabetical order above, because these two are
// one setting's two states rather than three peers.
const LIVE_ANALYSIS: Array<{ value: boolean; label: string }> = [
  { value: true, label: "Enable" },
  { value: false, label: "Disable" },
];

/** How the app looks, who the reader is, and how much it tells them. */
export default function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    theme,
    setTheme,
    playerName,
    setPlayerName,
    liveAnalysis,
    setLiveAnalysis,
  } = useSettings();
  const themeLabelId = useId();
  const liveAnalysisLabelId = useId();
  const nameInputId = useId();
  const nameInput = useRef<HTMLInputElement>(null);

  return (
    <DialogShell open={open} onOpenChange={onOpenChange} title="Settings">
      <div className="settings">
        <section className="settings__section">
          <h3 className="settings__label">
            <label htmlFor={nameInputId}>Player Name</label>
          </h3>
          {/* The well is the shell rather than the input, so the clear button
              sits inside it in a bay of its own, the way the home page's selects
              hold their chevron. */}
          <div className="settings__field">
            <input
              ref={nameInput}
              id={nameInputId}
              className="settings__field-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="As it appears in the picks"
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              // There is no form to submit, so enter would otherwise do nothing
              // and a phone would hold its keyboard over the rest of the dialog.
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
            />
            {/* Nothing to clear while the field is empty, and a button that does
                nothing is one more thing to tab past. Clearing therefore takes
                this button off screen, so the focus on it has to go somewhere
                first: left alone it falls to `<body>`, and the next tab restarts
                from the top of the document with the dialog still open. */}
            {playerName !== "" && (
              <button
                type="button"
                className="settings__field-clear"
                aria-label="Clear your player name"
                onClick={() => {
                  nameInput.current?.focus();
                  setPlayerName("");
                }}
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
          <h3 className="settings__label" id={liveAnalysisLabelId}>
            Live Player Analysis
          </h3>
          <div
            className="settings__choices"
            role="group"
            aria-labelledby={liveAnalysisLabelId}
          >
            {LIVE_ANALYSIS.map(({ value, label }) => (
              <Button
                key={label}
                compact
                selected={liveAnalysis === value}
                onClick={() => setLiveAnalysis(value)}
                className="settings__choice"
              >
                {label}
              </Button>
            ))}
          </div>
          <p className="settings__hint">
            {"Sometimes you don't want to know."}
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
