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
   * Set while the next answer is being worked out. Draws the bar on the rule,
   * named by `label`, which says what is being worked out.
   *
   * The name travels with the flag rather than beside it, so a dialog cannot draw
   * a bar with nothing to call it. A dialog that never waits passes nothing.
   */
  busy?: false | { label: string };
}>) {
  // Tapping a search opens a keyboard over the bottom of the screen, which the
  // sheet is sized and padded against. Only while the dialog is up, since nothing
  // else on any page has an input to open one.
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
                className="dialog__progress"
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
