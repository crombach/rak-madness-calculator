import {
  PropsWithChildren,
  ReactElement,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { v4 as uuidv4 } from "uuid";
import doNothing from "../utils/doNothing";

export const MAX_VISIBLE_TOASTS = 3;
/**
 * How long a toast that closes itself stays up. Long enough to read one line of
 * confirmation, and no longer: the only toasts on this clock say something
 * worked, and the reader is already looking at what it did.
 */
export const TOAST_LIFETIME_MS = 3000;

/** Each value has a matching ramp in `index.scss`. */
export type ToastType =
  "primary" | "neutral" | "success" | "warning" | "danger";

/**
 * The types the app reports a failure with. A failed upload, a failed export, and
 * a week that cannot be scored are only ever said here, so these wait to be read
 * rather than timing out.
 */
const PERSISTENT_TYPES: ReadonlySet<ToastType> = new Set(["warning", "danger"]);

/** Whether a toast waits to be dismissed rather than timing out on its own. */
export function isPersistent(toast: Toast): boolean {
  return PERSISTENT_TYPES.has(toast.type);
}

export class Toast {
  id: string;
  type: ToastType;
  header: string;
  message: string | ReactElement;

  constructor(type: ToastType, header: string, message: string | ReactElement) {
    this.id = uuidv4();
    this.type = type;
    this.header = header;
    this.message = message;
  }
}

/** The app's one way of saying something failed. */
export function errorToast(message: string): Toast {
  return new Toast("danger", "Error", message);
}

/** The app's one way of saying something worked. */
export function successToast(message: string): Toast {
  return new Toast("success", "Success", message);
}

type ToastActions = {
  showToast: (toast: Toast) => void;
  removeToast: (toast: Toast) => void;
  clearToasts: () => void;
  /** Holds every running timer while the reader is on the toasts. */
  pauseToasts: () => void;
  resumeToasts: () => void;
};

// The actions sit in their own context because their identity never changes. That
// keeps the parts of the app that only send toasts (every player cell, for one)
// still while toasts appear and time out.
const ToastActionsContext = createContext<ToastActions>({
  showToast: doNothing,
  removeToast: doNothing,
  clearToasts: doNothing,
  pauseToasts: doNothing,
  resumeToasts: doNothing,
});

const ToastListContext = createContext<Array<Toast>>([]);

/** For sending toasts. Does not re-render when the visible toasts change. */
export function useToastActions(): ToastActions {
  return useContext(ToastActionsContext);
}

/** For rendering toasts. `Toaster` is the only thing that needs this. */
export function useToasts(): Array<Toast> {
  return useContext(ToastListContext);
}

/** A toast's countdown, kept so it can be stopped and picked back up. */
type Countdown = {
  toast: Toast;
  /** Null while paused, when what is left is held rather than running down. */
  handle: number | null;
  /** What was left when it last started running. */
  remaining: number;
  startedAt: number;
};

export function ToastContextProvider({ children }: PropsWithChildren<object>) {
  const [toasts, setToasts] = useState<Array<Toast>>([]);
  const countdowns = useRef(new Map<string, Countdown>());

  const stopCountdown = useCallback((id: string) => {
    const countdown = countdowns.current.get(id);
    if (countdown?.handle != null) window.clearTimeout(countdown.handle);
    countdowns.current.delete(id);
  }, []);

  // Declared before showToast, which schedules it.
  const removeToast = useCallback(
    (toast: Toast) => {
      stopCountdown(toast.id);
      setToasts((oldToasts) => oldToasts.filter((it) => it.id !== toast.id));
    },
    [stopCountdown],
  );

  const startCountdown = useCallback(
    (toast: Toast, remaining: number) => {
      countdowns.current.set(toast.id, {
        toast,
        remaining,
        startedAt: Date.now(),
        handle: window.setTimeout(() => removeToast(toast), remaining),
      });
    },
    [removeToast],
  );

  const showToast = useCallback(
    (toast: Toast) => {
      setToasts((oldToasts) => {
        const newToasts = [...oldToasts, toast];
        const kept = newToasts.slice(
          Math.max(newToasts.length - MAX_VISIBLE_TOASTS, 0),
        );
        // Anything pushed off the end takes its countdown with it.
        for (const dropped of newToasts.filter((it) => !kept.includes(it))) {
          stopCountdown(dropped.id);
        }
        return kept;
      });
      if (!isPersistent(toast)) startCountdown(toast, TOAST_LIFETIME_MS);
    },
    [startCountdown, stopCountdown],
  );

  const clearToasts = useCallback(() => {
    for (const id of Array.from(countdowns.current.keys())) stopCountdown(id);
    setToasts([]);
  }, [stopCountdown]);

  const pauseToasts = useCallback(() => {
    for (const countdown of countdowns.current.values()) {
      if (countdown.handle == null) continue;
      window.clearTimeout(countdown.handle);
      countdown.handle = null;
      countdown.remaining = Math.max(
        countdown.remaining - (Date.now() - countdown.startedAt),
        0,
      );
    }
  }, []);

  const resumeToasts = useCallback(() => {
    // Held apart from the map while it is written to, since starting a countdown
    // replaces the entry being read.
    for (const countdown of Array.from(countdowns.current.values())) {
      if (countdown.handle != null) continue;
      startCountdown(countdown.toast, countdown.remaining);
    }
  }, [startCountdown]);

  const actions = useMemo(
    () => ({
      showToast,
      removeToast,
      clearToasts,
      pauseToasts,
      resumeToasts,
    }),
    [showToast, removeToast, clearToasts, pauseToasts, resumeToasts],
  );

  return (
    <ToastActionsContext.Provider value={actions}>
      <ToastListContext.Provider value={toasts}>
        {children}
      </ToastListContext.Provider>
    </ToastActionsContext.Provider>
  );
}
