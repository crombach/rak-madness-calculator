import { useState } from "react";
import Button from "../button/Button";
import DialogShell from "../dialog/DialogShell";
import { AddIcon, DeleteIcon } from "../icon/Icon";
import { PlayerOption } from "../playerAnalysis/PlayerAnalysisDialog";
import PlayerCombobox from "../playerAnalysis/PlayerCombobox";
import { MIN_PICKERS, pickerLabel } from "./comparedPlayers";
// For the section and label rules, which this dialog shares with Settings.
import "../settings/SettingsDialog.scss";
import "./ComparePlayers.scss";

/** One picker. `key` stays with it when an earlier one is removed. */
export type Slot = { key: number; id?: string };

function PlayerPicker({
  label,
  options,
  value,
  onValueChange,
  onRemove,
  canRemove,
  focusOnMount,
}: {
  label: string;
  options: Array<PlayerOption>;
  value?: PlayerOption;
  onValueChange: (chosen: PlayerOption) => void;
  onRemove: () => void;
  /** Whether the page holds more pickers than it opens with. */
  canRemove: boolean;
  focusOnMount?: boolean;
}) {
  const [query, setQuery] = useState(value?.name ?? "");
  return (
    <li className="compare-players__field">
      <PlayerCombobox
        ariaLabel={label}
        options={options}
        value={value}
        onValueChange={onValueChange}
        query={query}
        onQueryChange={setQuery}
        focusOnMount={focusOnMount}
      />
      <Button
        className="compare-players__remove"
        iconOnly
        ariaLabel={`Remove ${label}`}
        disabled={!canRemove}
        onClick={onRemove}
      >
        <DeleteIcon />
      </Button>
    </li>
  );
}

/** Who the page compares. */
export default function ComparePlayersDialog({
  open,
  onOpenChange,
  options,
  slots,
  canAdd,
  onChoose,
  onAdd,
  onRemove,
  addedKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: Array<PlayerOption>;
  slots: Array<Slot>;
  canAdd: boolean;
  onChoose: (key: number, id: string) => void;
  onAdd: () => void;
  onRemove: (key: number) => void;
  /** The picker "Add Player" made last, which takes the focus as it mounts. */
  addedKey?: number;
}) {
  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Compare Players"
    >
      <div className="settings">
        <section className="settings__section">
          <ul className="compare-players__pickers">
            {slots.map((slot, index) => {
              // Each list leaves out the players the other pickers hold.
              const taken = new Set(
                slots.filter(({ key }) => key !== slot.key).map(({ id }) => id),
              );
              const listed = options.filter((option) => !taken.has(option.id));
              return (
                <PlayerPicker
                  key={slot.key}
                  label={pickerLabel(index)}
                  options={listed}
                  value={listed.find((option) => option.id === slot.id)}
                  onValueChange={(option) => onChoose(slot.key, option.id)}
                  focusOnMount={slot.key === addedKey}
                  onRemove={() => onRemove(slot.key)}
                  canRemove={slots.length > MIN_PICKERS}
                />
              );
            })}
          </ul>
          {canAdd && (
            <Button className="compare-players__add" onClick={onAdd}>
              <AddIcon />
              Add Player
            </Button>
          )}
        </section>
      </div>
    </DialogShell>
  );
}
