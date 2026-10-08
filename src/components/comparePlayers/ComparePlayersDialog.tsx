import { RefObject, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Button from "../button/Button";
import DialogShell from "../dialog/DialogShell";
import { AddIcon, DeleteIcon } from "../icon/Icon";
import { PlayerOption } from "../playerAnalysis/playerOptions";
import PlayerCombobox from "../playerAnalysis/PlayerCombobox";
import { MIN_PICKERS, pickerLabel } from "./comparedPlayers";
// For the section and label rules, which this dialog shares with Settings.
import "./ComparePlayers.scss";

/**
 * One picker. `key` stays with it when an earlier one is removed. `missingName`
 * holds a saved player this week has no row for, in place of `id`.
 */
export type Slot = { key: number; id?: string; missingName?: string };

const MISSING_NOTE = "No picks this week";

function PlayerPicker({
  label,
  options,
  value,
  missingName,
  onValueChange,
  onRemove,
  canRemove,
  focusOnMount,
}: {
  label: string;
  options: Array<PlayerOption>;
  value?: PlayerOption;
  missingName?: string;
  onValueChange: (chosen: PlayerOption) => void;
  onRemove: () => void;
  /** Whether more than the fewest pickers remain. */
  canRemove: boolean;
  focusOnMount?: boolean;
}) {
  const [query, setQuery] = useState(value?.name ?? missingName ?? "");
  const noteId = useId();
  return (
    <li className="compare-players__field">
      <PlayerCombobox
        ariaLabel={label}
        ariaDescribedBy={missingName != null ? noteId : undefined}
        missingName={missingName}
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
      {/* Hidden, for a screen reader, which reads no strikethrough. */}
      {missingName != null && (
        <span id={noteId} className="compare-players__note">
          {MISSING_NOTE}
        </span>
      )}
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
  finalFocus,
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
  finalFocus?: RefObject<HTMLElement | null>;
}) {
  const addRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Choose Players"
      finalFocus={finalFocus}
    >
      <div ref={bodyRef} className="compare-players__dialog">
        <section className="compare-players__section">
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
                  missingName={slot.missingName}
                  onValueChange={(option) => onChoose(slot.key, option.id)}
                  focusOnMount={slot.key === addedKey}
                  onRemove={() => {
                    // The removed key goes with its picker, so focus moves to Add
                    // Player, which stays put. The remove renders first, since a
                    // full list shows Add Player only after it. Removing a missing
                    // player can leave Add Player hidden, so focus then moves to
                    // the dialog.
                    flushSync(() => onRemove(slot.key));
                    (
                      addRef.current ??
                      bodyRef.current?.closest<HTMLElement>('[role="dialog"]')
                    )?.focus();
                  }}
                  canRemove={slots.length > MIN_PICKERS}
                />
              );
            })}
          </ul>
          {canAdd && (
            <Button
              ref={addRef}
              className="compare-players__add"
              onClick={onAdd}
            >
              <AddIcon />
              Add Player
            </Button>
          )}
        </section>
      </div>
    </DialogShell>
  );
}
