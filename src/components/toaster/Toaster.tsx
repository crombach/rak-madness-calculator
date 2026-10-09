import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import {
  CheckCircleIcon,
  CloseIcon,
  InfoIcon,
  ReportIcon,
  WarningIcon,
} from "../icon/Icon";
import Button from "../button/Button";
import {
  Toast,
  isPersistent,
  useToastActions,
  useToasts,
} from "../../context/ToastContext";
import "./Toaster.scss";

const START_ICON_BY_TYPE: Record<Toast["type"], ReactNode> = {
  primary: <InfoIcon />,
  neutral: <InfoIcon />,
  success: <CheckCircleIcon />,
  warning: <WarningIcon />,
  danger: <ReportIcon />,
};

/** How long a dismissed toast stays to play its exit. */
const EXIT_MS = 200;

type Shown = { toast: Toast; isLeaving: boolean };

/**
 * The live toasts, plus each one just dismissed until its exit has played.
 * A new toast always lands at the end, so keeping the old order keeps every slot.
 */
function useWithExits(toasts: Array<Toast>): Array<Shown> {
  const [shown, setShown] = useState<Array<Shown>>(() =>
    toasts.map((toast) => ({ toast, isLeaving: false })),
  );
  // When each leaving toast was first seen leaving, so its exit runs from then.
  const leftAtById = useRef(new Map<Toast["id"], number>());
  const live = new Set(toasts.map((toast) => toast.id));
  const known = new Set(shown.map(({ toast }) => toast.id));
  const isStale =
    toasts.some((toast) => !known.has(toast.id)) ||
    shown.some(({ toast, isLeaving }) => !live.has(toast.id) && !isLeaving);
  if (isStale) {
    // Set during render, so no frame draws the old list.
    setShown([
      ...shown.map(({ toast }) => ({ toast, isLeaving: !live.has(toast.id) })),
      ...toasts
        .filter((toast) => !known.has(toast.id))
        .map((toast) => ({ toast, isLeaving: false })),
    ]);
  }

  useEffect(() => {
    const leftAtMap = leftAtById.current;
    const now = Date.now();
    const leavingIds = shown
      .filter(({ isLeaving }) => isLeaving)
      .map(({ toast }) => toast.id);
    if (leavingIds.length === 0) return;
    for (const id of leavingIds) if (!leftAtMap.has(id)) leftAtMap.set(id, now);
    const nextDeadline = Math.min(
      ...leavingIds.map((id) => (leftAtMap.get(id) ?? now) + EXIT_MS),
    );
    const timer = window.setTimeout(
      () => {
        const expiredAt = Date.now();
        const isExpired = (id: Toast["id"]) =>
          (leftAtMap.get(id) ?? expiredAt) + EXIT_MS <= expiredAt;
        setShown((old) =>
          old.filter(
            ({ toast, isLeaving }) => !(isLeaving && isExpired(toast.id)),
          ),
        );
      },
      Math.max(0, nextDeadline - now),
    );
    return () => window.clearTimeout(timer);
  }, [shown]);

  return shown;
}

export default function Toaster() {
  const toasts = useToasts();
  const shown = useWithExits(toasts);
  const { removeToast, pauseToasts, resumeToasts } = useToastActions();

  return (
    // Named and present before any toast is, because a live region created in the
    // same tick as its content is one iOS VoiceOver can miss.
    <div
      className="toaster"
      style={{ "--toast-exit-duration": `${EXIT_MS}ms` } as CSSProperties}
      role="region"
      aria-label="Notifications"
      onPointerEnter={pauseToasts}
      onPointerLeave={resumeToasts}
      onFocus={pauseToasts}
      onBlur={resumeToasts}
    >
      {shown.map(({ toast, isLeaving }) => {
        return (
          <div
            key={toast.id}
            className="toast-slot"
            data-leaving={isLeaving || undefined}
            inert={isLeaving || undefined}
          >
            <div className="toast-slot__inner">
              <div
                className={`toast --${toast.type}`}
                // Only a failure interrupts. Tapping a pick raises a toast about it,
                // and that waits its turn rather than cut off whatever is being read.
                role={isPersistent(toast) ? "alert" : "status"}
              >
                <span className="toast__icon">
                  {START_ICON_BY_TYPE[toast.type]}
                </span>
                <div className="toast__body">
                  <div className="toast__header">{toast.header}</div>
                  <div className="toast__message">{toast.message}</div>
                </div>
                <Button
                  ariaLabel="Dismiss"
                  variant="soft"
                  size="sm"
                  iconOnly
                  className="toast__close"
                  onClick={() => removeToast(toast)}
                >
                  <CloseIcon />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
