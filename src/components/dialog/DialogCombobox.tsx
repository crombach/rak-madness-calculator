import { Combobox } from "@base-ui-components/react/combobox";
import { ReactNode, useRef } from "react";
import { UnfoldMoreIcon } from "../icon/Icon";
import { DIALOG_POPUP_CLASS } from "./DialogShell";
import "./DialogCombobox.scss";

/**
 * The search a dialog is pointed at one of its subjects with.
 *
 * Fully controlled: both the choice and the text in the input are held by the
 * caller, so a subject arriving from outside can be taken without the combobox
 * being torn down and rebuilt around it.
 */
export default function DialogCombobox<T>({
  ariaLabel,
  placeholder,
  emptyMessage,
  items,
  filteredItems,
  value,
  onValueChange,
  query,
  onQueryChange,
  itemToStringLabel,
  itemKey,
  optionClassName,
  adornment,
  renderOption,
}: {
  ariaLabel: string;
  placeholder: string;
  /** Shown in place of the list where the query reaches nothing. */
  emptyMessage: string;
  items: Array<T>;
  filteredItems: Array<T>;
  value?: T;
  onValueChange: (chosen: T) => void;
  query: string;
  onQueryChange: (query: string) => void;
  itemToStringLabel: (item: T) => string;
  itemKey: (item: T) => string;
  optionClassName?: (item: T) => string;
  /**
   * Held at the end of the input, saying something about what is chosen. Drawn
   * only while the input still names it, so a cleared search clears this too.
   */
  adornment?: ReactNode;
  renderOption: (item: T) => ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Whether the input still reads as the choice the adornment speaks for.
   *
   * A press wipes the query below without touching the choice, so between that
   * and the next selection the adornment would be marking a subject the input no
   * longer names. Base UI writes the chosen label back on the way out of a list
   * dismissed without a pick, so that restores this along with the text.
   */
  const showsChoice = value != null && query === itemToStringLabel(value);

  /**
   * Choosing is the end of the search, so the input gives the focus up.
   *
   * A phone's keyboard covers the bottom of the screen while the input holds it,
   * which is where the answer that was just chosen reads. The dialog itself takes
   * the focus rather than nothing, so it is still what Escape and a screen reader
   * are working in.
   */
  function releaseFocus() {
    const input = inputRef.current;
    const popup = input?.closest<HTMLElement>(`.${DIALOG_POPUP_CLASS}`);
    if (popup != null) popup.focus();
    else input?.blur();
  }

  return (
    /*
      Typed on `T | null` rather than on `T`, because nothing is chosen until a
      subject arrives and a controlled combobox has to be handed something other
      than `undefined` from its first render.
    */
    <Combobox.Root<T | null>
      value={value ?? null}
      items={items}
      filteredItems={filteredItems}
      itemToStringLabel={(item: T | null) =>
        item != null ? itemToStringLabel(item) : ""
      }
      // Null arrives when the input is cleared to type another name. The dialog is
      // opened on a subject and answers for one from then on, so that clears the
      // search rather than the answer under it.
      onValueChange={(chosen: T | null) => {
        if (chosen == null) return;
        onValueChange(chosen);
        releaseFocus();
      }}
      // Base UI writes the chosen label back through this on the way out, so
      // dismissing without picking anything restores it.
      inputValue={query}
      onInputValueChange={onQueryChange}
      // Tapping the search is the start of looking something else up, so what is
      // already in it goes rather than being deleted by hand. Only a press:
      // opening by typing reports `input-change`, and wiping that would take the
      // letters that opened the list.
      onOpenChange={(listOpen, details) => {
        if (listOpen && details.reason === "trigger-press") onQueryChange("");
      }}
      // The list is short and already on screen, so the first match being
      // highlighted saves an arrow key before Enter.
      autoHighlight
    >
      <div className="dialog__search">
        {/*
          A press anywhere on the field opens the list, rather than only one landing
          in the input. This fills the field and everything else in it draws over
          it, so the icon, the adornment, and the padding around them all reach it.

          The input alone sits above it and keeps its own press, which is what a
          phone needs: the trigger raises no keyboard on a touch, and a search
          opened without one cannot be typed into.

          Out of a reader's way, which has the input's own `combobox` role for all
          of this and would otherwise be offered a second, nameless control.
        */}
        <Combobox.Trigger
          className="dialog__search-trigger"
          aria-hidden="true"
          tabIndex={-1}
        />
        <Combobox.Input
          ref={inputRef}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="dialog__input"
        />
        {showsChoice && adornment}
        <Combobox.Icon className="dialog__input-icon">
          <UnfoldMoreIcon />
        </Combobox.Icon>
      </div>
      <Combobox.Portal>
        {/* Wherever there is room for it, which is under the input in all but the
            tightest case. Held below it and nowhere else, the list ran off the
            bottom of a phone; `index.html` hands a keyboard's height back to the
            layout viewport, so a list flipped over the input lands on screen. */}
        <Combobox.Positioner className="dialog__positioner" sideOffset={4}>
          <Combobox.Popup className="dialog__list">
            <Combobox.Empty className="dialog__empty">
              {emptyMessage}
            </Combobox.Empty>
            <Combobox.List>
              {(item: T) => (
                <Combobox.Item
                  key={itemKey(item)}
                  value={item}
                  className={`dialog__option ${optionClassName?.(item) ?? ""}`}
                >
                  {renderOption(item)}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
