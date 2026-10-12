import { ComponentType, useState } from "react";
import { errorToast, useToastActions } from "../../context/ToastContext";
import lazyPreloadable from "../../utils/lazyPreloadable";
import DialogLoadBoundary, { DIALOG_LOAD_ERROR } from "./DialogLoadBoundary";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * A dialog fetched apart from the entry, which can be fetched ahead of its first
 * open. A chunk that fails to load toasts `DIALOG_LOAD_ERROR` and closes the
 * dialog. Each later open tries again and toasts again.
 *
 * No fallback. A dialog mounts closed, and the open that beats the fetch wants
 * the dialog rather than a spinner where it will be.
 */
export default function lazyDialog<P extends DialogProps>(
  loader: () => Promise<{ default: ComponentType<P> }>,
) {
  const { Page, preload, isLoaded } = lazyPreloadable(loader, null);

  function Dialog(props: P) {
    const { showToast } = useToastActions();
    // Bumped by each failure, so the next open mounts a boundary that has not
    // failed yet.
    const [failures, setFailures] = useState(0);
    const [isHeld, setHeld] = useState(false);
    const [wasOpen, setWasOpen] = useState(props.open);
    if (props.open !== wasOpen) {
      setWasOpen(props.open);
      if (props.open) setHeld(false);
    }
    // `lazy` throws again on every render, so nothing renders until a new open.
    if (isHeld) return null;
    return (
      <DialogLoadBoundary
        key={failures}
        onError={() => {
          showToast(errorToast(DIALOG_LOAD_ERROR));
          setFailures((count) => count + 1);
          setHeld(true);
          props.onOpenChange(false);
        }}
      >
        <Page {...props} />
      </DialogLoadBoundary>
    );
  }

  return { Dialog, preload, isLoaded };
}
