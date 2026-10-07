import { Menu } from "@base-ui/react/menu";
import { useId, useRef, useState } from "react";
import Button, { buttonClasses } from "../button/Button";
import { isSameName, Preset } from "./comparedPlayers";

const NO_PRESETS = "No presets saved";
const NO_NAME = "Name the preset first";
const NO_PLAYERS = "Choose a player first";
const NO_MATCH = "No preset by this name";

const TRIGGER_CLASSES = buttonClasses({ className: "compare-players__load" });

/** Saves the players chosen under a name, and loads or deletes them by it. */
export default function ComparePresets({
  presets,
  canSave,
  onLoad,
  onSave,
  onDelete,
}: {
  presets: Array<Preset>;
  /** Whether any picker holds a player to save. */
  canSave: boolean;
  onLoad: (preset: Preset) => void;
  onSave: (name: string) => void;
  onDelete: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const inputId = useId();
  const loadReasonId = useId();
  const saveReasonId = useId();
  const deleteReasonId = useId();
  const match = presets.find((preset) => isSameName(preset.name, name));
  const loadReason = presets.length === 0 ? NO_PRESETS : undefined;
  const saveReason =
    name.trim() === "" ? NO_NAME : !canSave ? NO_PLAYERS : undefined;
  const deleteReason = match == null ? NO_MATCH : undefined;

  return (
    <section
      className="compare-players__section compare-players__presets"
      aria-labelledby={labelId}
    >
      <h3 id={labelId} className="compare-players__group-label">
        Presets
      </h3>
      <Menu.Root>
        <Menu.Trigger
          className={TRIGGER_CLASSES}
          disabled={loadReason != null}
          aria-describedby={loadReason && loadReasonId}
        >
          Load Preset
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner
            className="compare-players__positioner"
            align="start"
            sideOffset={4}
          >
            <Menu.Popup className="compare-players__preset-list">
              {presets.map((preset) => (
                <Menu.Item
                  key={preset.name}
                  className="compare-players__preset"
                  onClick={() => {
                    setName(preset.name);
                    onLoad(preset);
                  }}
                >
                  {preset.name}
                </Menu.Item>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <Reason id={loadReasonId} reason={loadReason} />
      <label htmlFor={inputId} className="compare-players__preset-label">
        Preset Name
      </label>
      <input
        ref={nameInput}
        id={inputId}
        className="compare-players__preset-name"
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <div className="compare-players__preset-actions">
        <div className="compare-players__preset-action">
          <Button
            disabled={saveReason != null}
            ariaDescribedBy={saveReason && saveReasonId}
            onClick={() => onSave(name)}
          >
            {match == null ? "Save" : "Replace"}
          </Button>
          <Reason id={saveReasonId} reason={saveReason} />
        </div>
        <div className="compare-players__preset-action">
          <Button
            disabled={deleteReason != null}
            ariaDescribedBy={deleteReason && deleteReasonId}
            onClick={() => {
              // Deleting disables this button, which would drop the focus to `<body>`.
              nameInput.current?.focus();
              onDelete(name);
            }}
          >
            Delete
          </Button>
          <Reason id={deleteReasonId} reason={deleteReason} />
        </div>
      </div>
    </section>
  );
}

function Reason({ id, reason }: { id: string; reason?: string }) {
  return reason == null ? null : (
    <p id={id} className="compare-players__reason">
      {reason}
    </p>
  );
}
