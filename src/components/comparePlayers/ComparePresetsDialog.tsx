import {
  KeyboardEvent,
  RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import doNothing from "../../utils/doNothing";
import Button from "../button/Button";
import DialogShell from "../dialog/DialogShell";
import { CloseIcon, ConfirmIcon, DeleteIcon, EditIcon } from "../icon/Icon";
import { isSameName, MAX_PRESET_NAME, Preset } from "./comparedPlayers";
import "./ComparePlayers.scss";
import useStatus from "./useStatus";

const NO_PRESETS = "No presets saved";
const NO_PLAYERS = "Choose a player first";
const NAME_TAKEN = "Another preset has this name";
const NAME_BLANK = "Type a new name";

/** Why a key is disabled. `alert` announces a reason that appears as the reader types. */
function Reason({
  id,
  reason,
  alert = false,
}: {
  id: string;
  reason?: string;
  alert?: boolean;
}) {
  return reason == null ? null : (
    <p
      id={id}
      className="compare-players__reason"
      role={alert ? "alert" : undefined}
    >
      {reason}
    </p>
  );
}

/**
 * Runs `action` on Enter in a field, as a form's submit would. `preventDefault`
 * stops the same press from clicking the key that takes focus.
 */
function onEnter(action?: () => void) {
  return (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    action?.();
  };
}

/** Why a preset cannot take `draft` as its name, or nothing when it can. */
function renameReason(preset: Preset, presets: Array<Preset>, draft: string) {
  if (draft.trim() === "") return NAME_BLANK;
  const taken = presets.some(
    (other) => other !== preset && isSameName(other.name, draft),
  );
  return taken ? NAME_TAKEN : undefined;
}

function PresetRow({
  preset,
  draft,
  reason,
  focusRename,
  onLoad,
  onDraft,
  onRename,
  onDelete,
}: {
  preset: Preset;
  /** The name being typed, while this preset is renamed. */
  draft?: string;
  reason?: string;
  /** Focuses the rename key as it mounts or as this turns on. */
  focusRename: boolean;
  onLoad: () => void;
  onDraft: (draft?: string) => void;
  onRename?: () => void;
  onDelete: () => void;
}) {
  const rowRef = useRef<HTMLLIElement>(null);
  const draftRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLButtonElement>(null);
  const reasonId = useId();
  const isRenaming = draft != null;
  useEffect(() => {
    if (isRenaming) draftRef.current?.focus();
  }, [isRenaming]);
  useEffect(() => {
    if (focusRename) renameRef.current?.focus();
  }, [focusRename]);

  return (
    <li ref={rowRef} className="compare-players__preset-row">
      <div className="compare-players__field">
        {isRenaming ? (
          <>
            <input
              ref={draftRef}
              className="compare-players__preset-name"
              aria-label={`New name for ${preset.name}`}
              aria-describedby={reason && reasonId}
              type="text"
              maxLength={MAX_PRESET_NAME}
              autoComplete="off"
              spellCheck={false}
              value={draft}
              onChange={(event) => onDraft(event.target.value)}
              onKeyDown={onEnter(onRename)}
            />
            <Button
              iconOnly
              ariaLabel={`Save the name of ${preset.name}`}
              disabled={onRename == null}
              onClick={onRename ?? doNothing}
            >
              <ConfirmIcon />
            </Button>
            <Button
              iconOnly
              ariaLabel={`Keep the name ${preset.name}`}
              onClick={() => onDraft(undefined)}
            >
              <CloseIcon />
            </Button>
          </>
        ) : (
          <>
            <Button className="compare-players__preset-load" onClick={onLoad}>
              <span className="compare-players__preset-label">
                {preset.name}
              </span>
            </Button>
            <Button
              ref={renameRef}
              iconOnly
              ariaLabel={`Rename ${preset.name}`}
              onClick={() => onDraft(preset.name)}
            >
              <EditIcon />
            </Button>
            <Button
              iconOnly
              ariaLabel={`Delete ${preset.name}`}
              onClick={() => {
                // The row goes, so focus moves to the preset that takes its place.
                const row = rowRef.current;
                const neighbor =
                  row?.nextElementSibling ?? row?.previousElementSibling;
                neighbor
                  ?.querySelector<HTMLButtonElement>("button:enabled")
                  ?.focus();
                onDelete();
              }}
            >
              <DeleteIcon />
            </Button>
          </>
        )}
      </div>
      <Reason id={reasonId} reason={reason} alert />
    </li>
  );
}

/** The saved presets, and a form that saves the chosen players as a new one. */
export default function ComparePresetsDialog({
  open,
  onOpenChange,
  finalFocus,
  presets,
  canSave,
  onLoad,
  onSave,
  onRename,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finalFocus?: RefObject<HTMLElement | null>;
  presets: Array<Preset>;
  /** Whether any picker holds a player to save. */
  canSave: boolean;
  onLoad: (preset: Preset) => void;
  onSave: (name: string) => void;
  onRename: (from: string, to: string) => void;
  onDelete: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [status, announce] = useStatus();
  // One preset renames at a time. `refocus` names the one whose rename key takes
  // the focus back, which a rename remounts under its new name.
  const [renaming, setRenaming] = useState<{ name: string; draft: string }>();
  const [refocus, setRefocus] = useState<string>();
  const nameInput = useRef<HTMLInputElement>(null);
  const savedId = useId();
  const inputId = useId();
  const saveReasonId = useId();
  const match = presets.find((preset) => isSameName(preset.name, name));
  const saveReason = canSave ? undefined : NO_PLAYERS;
  const save =
    name.trim() !== "" && saveReason == null
      ? () => {
          announce(`Saved ${name.trim()}`);
          setRefocus(undefined);
          onSave(name);
          setName("");
        }
      : undefined;

  // A rename left open drops its draft when the dialog closes.
  const changeOpen = (next: boolean) => {
    if (!next) {
      setRenaming(undefined);
      setRefocus(undefined);
    }
    onOpenChange(next);
  };

  const rowState = (preset: Preset) => {
    const draft = renaming?.name === preset.name ? renaming.draft : undefined;
    const reason =
      draft == null ? undefined : renameReason(preset, presets, draft);
    const stop = (name: string) => {
      setRenaming(undefined);
      setRefocus(name);
    };
    return {
      draft,
      reason,
      focusRename: refocus === preset.name,
      onDraft: (next?: string) => {
        if (next == null) stop(preset.name);
        else {
          setRefocus(undefined);
          setRenaming({ name: preset.name, draft: next });
        }
      },
      onRename:
        draft != null && reason == null
          ? () => {
              announce(`Renamed ${preset.name} to ${draft.trim()}`);
              onRename(preset.name, draft);
              stop(draft.trim());
            }
          : undefined,
    };
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={changeOpen}
      title="Player Presets"
      finalFocus={finalFocus}
    >
      <div className="compare-players__dialog compare-players__dialog--presets">
        <section className="compare-players__presets" aria-labelledby={savedId}>
          <h3 id={savedId} className="compare-players__group-label">
            Saved
          </h3>
          {presets.length === 0 ? (
            <p className="compare-players__reason">{NO_PRESETS}</p>
          ) : (
            <ul className="compare-players__pickers">
              {presets.map((preset) => (
                <PresetRow
                  key={preset.name}
                  preset={preset}
                  {...rowState(preset)}
                  onLoad={() => {
                    onLoad(preset);
                    changeOpen(false);
                  }}
                  onDelete={() => {
                    if (presets.length === 1) nameInput.current?.focus();
                    announce(`Deleted ${preset.name}`);
                    setRefocus(undefined);
                    onDelete(preset.name);
                  }}
                />
              ))}
            </ul>
          )}
        </section>
        <section className="compare-players__presets">
          <h3 className="compare-players__group-label">
            <label htmlFor={inputId}>Preset Name</label>
          </h3>
          <input
            ref={nameInput}
            id={inputId}
            className="compare-players__preset-name"
            type="text"
            maxLength={MAX_PRESET_NAME}
            autoComplete="off"
            spellCheck={false}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={onEnter(save)}
          />
          <Button
            disabled={save == null}
            ariaDescribedBy={saveReason && saveReasonId}
            onClick={save ?? doNothing}
          >
            {match == null ? "Save Current Players" : "Replace Preset"}
          </Button>
          <Reason id={saveReasonId} reason={saveReason} />
        </section>
        <p role="status" className="compare-players__status">
          {status}
        </p>
      </div>
    </DialogShell>
  );
}
