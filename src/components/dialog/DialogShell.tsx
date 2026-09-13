import { Dialog } from "@base-ui/react/dialog";
import { PropsWithChildren, ReactNode } from "react";
import useViewportInsets from "../../hooks/useViewportInsets";
import Button from "../button/Button";
import { CloseIcon } from "../icon/Icon";
import "./DialogShell.scss";

/** The class the dialog's popup carries, so other modules can select it. */
export const DIALOG_POPUP_CLASS = "dialog__popup";

/**
 * The dialog every full-screen answer in the app is shown in.
 *
 * A centered modal by default and a sheet up from the bottom edge on a phone. Both
 * are the one Base UI dialog, told apart in the stylesheet, because that is where
 * the rest of the app draws the same line.
 *
 * `search` sits above the rule the body hangs off, so it holds still while
 * everything under it scrolls.
 */
export default function DialogShell({
  open,
  onOpenChange,
  title,
  search,
  busy = false,
  children,
}: PropsWithChildren<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** The control that picks what the body is about. */
  search?: ReactNode;
  /**
   * Set while the next answer is being worked out. Draws the bar on the rule.
   * `label` names what is being worked out.
   *
   * The name travels with the flag rather than beside it, so a dialog cannot draw
   * a bar with nothing to call it. A dialog that never waits passes nothing.
   *
   * `tone` paints the bar in the mark a game being played wears, for a wait on
   * such a game. Left off, the bar is the neutral one every other wait draws.
   */
  busy?: false | { label: string; tone?: "live" };
}>) {
  // A search opens a keyboard over the screen's bottom, which the sheet sizes and
  // pads against. Only while the dialog is up, since no other page has an input.
  useViewportInsets(open);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="dialog__backdrop" />
        <Dialog.Popup className={DIALOG_POPUP_CLASS}>
          <header className="dialog__header">
            <Dialog.Title className="dialog__title">{title}</Dialog.Title>
            <Button
              ariaLabel="Close"
              variant="soft"
              iconOnly
              onClick={() => onOpenChange(false)}
            >
              <CloseIcon />
            </Button>
          </header>

          {search}

          <div className="dialog__body">
            {busy && (
              <span
                className={`dialog__progress${busy.tone ? ` --${busy.tone}` : ""}`}
                role="progressbar"
                aria-busy="true"
                aria-label={busy.label}
              />
            )}
            {/* Polite, so a new answer replacing the last one is read once the
                screen reader is free rather than cutting off what it is saying. */}
            <div aria-live="polite">{children}</div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
