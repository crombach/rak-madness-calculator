import { Combobox } from "@base-ui/react/combobox";
import { memo, ReactNode, useEffect, useRef, useState } from "react";
import { UnfoldMoreIcon } from "../icon/Icon";
import { DIALOG_POPUP_CLASS } from "./DialogShell";
import "./DialogCombobox.scss";
import getClasses from "../../utils/getClasses";

type OptionProps<T> = {
  item: T;
  className: string;
  render: (item: T) => ReactNode;
};

/** Ignores `render`'s identity, since every caller passes it inline. */
const Option = memo(
  function Option<T>({ item, className, render }: OptionProps<T>) {
    return (
      <Combobox.Item value={item} className={className}>
        {render(item)}
      </Combobox.Item>
    );
  },
  (previous, next) =>
    previous.item === next.item && previous.className === next.className,
) as <T>(props: OptionProps<T>) => ReactNode;

/**
 * The search a dialog is pointed at one of its subjects with.
 *
 * Fully controlled. Both the choice and the text in the input are held by the
 * caller, so a subject arriving from outside can be taken without the combobox
 * being torn down and rebuilt around it.
 */
export default function DialogCombobox<T>({
  ariaLabel,
  ariaDescribedBy,
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
  renderValue,
  unlisted,
  renderOption,
  focusOnMount = false,
}: {
  ariaLabel: string;
  ariaDescribedBy?: string;
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
  /**
   * The choice as styled text, drawn over the input while it names the choice and
   * has no focus. An input holds plain text alone, so this is what styles it.
   */
  renderValue?: (item: T) => ReactNode;
  /**
   * A subject the caller holds with no entry in `items`. Its `text` starts the
   * input, and `overlay` styles it the way `renderValue` styles a choice.
   */
  unlisted?: { text: string; overlay: ReactNode };
  /** Reads the item alone. An entry is drawn again only when its item changes. */
  renderOption: (item: T) => ReactNode;
  /** Focuses the input as it mounts. */
  focusOnMount?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Read once, since the focus belongs to the mount alone.
  const [shouldFocus] = useState(focusOnMount);
  useEffect(() => {
    if (shouldFocus) inputRef.current?.focus();
  }, [shouldFocus]);

  /**
   * Whether the input still reads as the choice the adornment speaks for.
   *
   * A press wipes the query below without touching the choice, so between that
   * and the next selection the adornment would be marking a subject the input no
   * longer names. Base UI writes the chosen label back on the way out of a list
   * dismissed without a pick, so that restores this along with the text.
   */
  const showsChoice = value != null && query === itemToStringLabel(value);
  const showsUnlisted =
    value == null && unlisted != null && query === unlisted.text;
  const overlay = showsChoice
    ? renderValue?.(value)
    : showsUnlisted
      ? unlisted.overlay
      : undefined;

  /**
   * Choosing is the end of the search, so the input gives the focus up.
   *
   * A phone's keyboard covers the bottom of the screen while the input holds it.
   * That is where the answer that was just chosen reads. The dialog itself takes
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
      // already in it goes rather than being deleted by hand. A press on the input
      // and a press on the trigger over the rest of the field report their own
      // reason, and both are the same tap to the reader. Only a press. Opening by
      // typing reports `input-change`, and wiping that would take the letters that
      // opened the list.
      onOpenChange={(listOpen, details) => {
        const pressed =
          details.reason === "trigger-press" ||
          details.reason === "input-press";
        if (listOpen && pressed) onQueryChange("");
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

          The input alone sits above it and keeps its own press, which places the
          caret where the reader pressed. Base UI hands the input the focus from
          here as well, but not from a touch, so a phone opened the search with no
          keyboard to type into it. The click covers that, and it is the gesture a
          phone raises the keyboard on.

          The trigger stays hidden from a reader. The input already carries the
          combobox role for all of this, so an exposed trigger would only be a
          second, nameless control.
        */}
        <Combobox.Trigger
          className="dialog__search-trigger"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => inputRef.current?.focus()}
        />
        <span className="dialog__input-box">
          <Combobox.Input
            ref={inputRef}
            placeholder={placeholder}
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            className={getClasses("dialog__input", {
              "--overlaid": overlay != null,
            })}
          />
          {overlay != null && (
            <span className="dialog__input-value" aria-hidden="true">
              {overlay}
            </span>
          )}
        </span>
        {showsChoice && adornment}
        <Combobox.Icon className="dialog__input-icon">
          <UnfoldMoreIcon />
        </Combobox.Icon>
      </div>
      <Combobox.Portal>
        {/* Wherever there is room for it, which is under the input in all but the
            tightest case. Held below it and nowhere else, the list ran off the
            bottom of a phone. `index.html` hands a keyboard's height back to the
            layout viewport, so a list flipped over the input lands on screen. */}
        <Combobox.Positioner className="dialog__positioner" sideOffset={4}>
          <Combobox.Popup className="dialog__list">
            <Combobox.Empty className="dialog__empty">
              {emptyMessage}
            </Combobox.Empty>
            <Combobox.List>
              {(item: T) => (
                <Option
                  key={itemKey(item)}
                  item={item}
                  className={getClasses(
                    "dialog__option",
                    optionClassName?.(item),
                  )}
                  render={renderOption}
                />
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
