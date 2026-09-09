import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  TOAST_LIFETIME_MS,
  Toast,
  ToastContextProvider,
  useToastActions,
  useToasts,
} from "./ToastContext";

/** Exposes the whole context as buttons plus a rendered list of toast headers. */
function Harness() {
  const toasts = useToasts();
  const { showToast, removeToast, clearToasts, pauseToasts, resumeToasts } =
    useToastActions();
  return (
    <div>
      <ul data-testid="toasts">
        {toasts.map((toast) => (
          <li key={toast.id}>{toast.header}</li>
        ))}
      </ul>
      <button onClick={() => showToast(new Toast("neutral", "A", "a"))}>
        show A
      </button>
      <button onClick={() => showToast(new Toast("neutral", "B", "b"))}>
        show B
      </button>
      <button onClick={() => showToast(new Toast("neutral", "C", "c"))}>
        show C
      </button>
      <button onClick={() => showToast(new Toast("neutral", "D", "d"))}>
        show D
      </button>
      <button onClick={() => showToast(new Toast("danger", "E", "e"))}>
        show E
      </button>
      <button onClick={() => removeToast(toasts[0])} disabled={!toasts.length}>
        remove first
      </button>
      <button onClick={clearToasts}>clear</button>
      <button onClick={pauseToasts}>pause</button>
      <button onClick={resumeToasts}>resume</button>
    </div>
  );
}

function mountHarness() {
  render(
    <ToastContextProvider>
      <Harness />
    </ToastContextProvider>,
  );
}

function headers(): Array<string> {
  return Array.from(screen.getByTestId("toasts").children).map(
    (item) => item.textContent ?? "",
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  // Every toast a test leaves standing still has a dismissal timer behind it,
  // and running it removes the toast. Inside `act`, so that last render is one
  // React knows about rather than a warning per surviving toast.
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
});

describe("Toast", () => {
  it("gives every toast a distinct id", () => {
    const first = new Toast("neutral", "A", "a");
    const second = new Toast("neutral", "A", "a");
    expect(first.id).not.toBe(second.id);
  });

  it("keeps the type, header, and message it was given", () => {
    const toast = new Toast("danger", "Error", "it broke");
    expect(toast.type).toBe("danger");
    expect(toast.header).toBe("Error");
    expect(toast.message).toBe("it broke");
  });
});

describe("ToastContextProvider", () => {
  it("starts with no toasts", () => {
    mountHarness();
    expect(headers()).toEqual([]);
  });

  it("shows toasts in the order they arrive", () => {
    mountHarness();
    fireEvent.click(screen.getByText("show A"));
    fireEvent.click(screen.getByText("show B"));
    expect(headers()).toEqual(["A", "B"]);
  });

  it("keeps only the newest three, dropping the oldest", () => {
    mountHarness();
    fireEvent.click(screen.getByText("show A"));
    fireEvent.click(screen.getByText("show B"));
    fireEvent.click(screen.getByText("show C"));
    fireEvent.click(screen.getByText("show D"));
    expect(headers()).toEqual(["B", "C", "D"]);
  });

  it("removes a toast by identity, not by position", () => {
    mountHarness();
    fireEvent.click(screen.getByText("show A"));
    fireEvent.click(screen.getByText("show B"));
    fireEvent.click(screen.getByText("remove first"));
    expect(headers()).toEqual(["B"]);
  });

  it("clears every toast at once", () => {
    mountHarness();
    fireEvent.click(screen.getByText("show A"));
    fireEvent.click(screen.getByText("show B"));
    fireEvent.click(screen.getByText("clear"));
    expect(headers()).toEqual([]);
  });

  it("auto-dismisses a toast after its lifetime", () => {
    mountHarness();
    fireEvent.click(screen.getByText("show A"));
    expect(headers()).toEqual(["A"]);

    act(() => {
      vi.advanceTimersByTime(TOAST_LIFETIME_MS - 1);
    });
    expect(headers()).toEqual(["A"]);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(headers()).toEqual([]);
  });

  it("auto-dismisses each toast on its own schedule", () => {
    mountHarness();
    fireEvent.click(screen.getByText("show A"));

    act(() => {
      vi.advanceTimersByTime(TOAST_LIFETIME_MS / 2);
    });
    fireEvent.click(screen.getByText("show B"));
    expect(headers()).toEqual(["A", "B"]);

    // A's lifetime is up, B's is not.
    act(() => {
      vi.advanceTimersByTime(TOAST_LIFETIME_MS / 2);
    });
    expect(headers()).toEqual(["B"]);

    act(() => {
      vi.advanceTimersByTime(TOAST_LIFETIME_MS / 2);
    });
    expect(headers()).toEqual([]);
  });

  it("does not resurrect a cleared toast when its timer fires", () => {
    mountHarness();
    fireEvent.click(screen.getByText("show A"));
    fireEvent.click(screen.getByText("clear"));

    act(() => {
      vi.advanceTimersByTime(TOAST_LIFETIME_MS);
    });
    expect(headers()).toEqual([]);
  });

  it("holds a paused toast, then gives it back the time it had left", () => {
    mountHarness();
    fireEvent.click(screen.getByText("show A"));

    act(() => {
      vi.advanceTimersByTime(TOAST_LIFETIME_MS - 1000);
    });
    fireEvent.click(screen.getByText("pause"));

    // Long past its lifetime, and still on screen, because nothing is counting.
    act(() => {
      vi.advanceTimersByTime(TOAST_LIFETIME_MS * 2);
    });
    expect(headers()).toEqual(["A"]);

    fireEvent.click(screen.getByText("resume"));
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(headers()).toEqual(["A"]);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(headers()).toEqual([]);
  });

  it("leaves a failure on screen until it is dismissed", () => {
    mountHarness();
    fireEvent.click(screen.getByText("show E"));

    act(() => {
      vi.advanceTimersByTime(TOAST_LIFETIME_MS * 10);
    });
    expect(headers()).toEqual(["E"]);

    fireEvent.click(screen.getByText("remove first"));
    expect(headers()).toEqual([]);
  });

  it("dismisses the oldest toast even after it was pushed out by the cap", () => {
    mountHarness();
    fireEvent.click(screen.getByText("show A"));
    fireEvent.click(screen.getByText("show B"));
    fireEvent.click(screen.getByText("show C"));
    fireEvent.click(screen.getByText("show D"));

    act(() => {
      vi.advanceTimersByTime(TOAST_LIFETIME_MS);
    });
    expect(headers()).toEqual([]);
  });
});

describe("the toast hooks outside a provider", () => {
  it("falls back to no-ops rather than throwing", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("show A"));
    expect(headers()).toEqual([]);
  });
});

// Counting renders in the component body rather than through React.Profiler.
// Profiler does not report a commit when only a nested context consumer
// re-renders, which is exactly the case under test.
const renders = { actionsOnly: 0, toastList: 0 };

/** Reads the actions and nothing else, the way a player cell does. */
function ActionsOnlyProbe() {
  // Counting a render is the impurity the immutability rule exists to prevent.
  // Observing it is the whole point here.
  // eslint-disable-next-line react-hooks/immutability
  renders.actionsOnly += 1;
  const { showToast } = useToastActions();
  return <button onClick={() => showToast(new Toast("neutral", "Z", "z"))} />;
}

/** The control: a consumer that reads the list does re-render. */
function ToastListProbe() {
  // eslint-disable-next-line react-hooks/immutability
  renders.toastList += 1;
  return <span>{useToasts().length}</span>;
}

describe("toast actions", () => {
  function mountProbes() {
    renders.actionsOnly = 0;
    renders.toastList = 0;
    // No StrictMode here on purpose: its double-invoked renders would double
    // every count below.
    render(
      <ToastContextProvider>
        <ActionsOnlyProbe />
        <ToastListProbe />
        <Harness />
      </ToastContextProvider>,
    );
  }

  it("does not re-render an actions-only consumer when a toast appears", () => {
    mountProbes();

    fireEvent.click(screen.getByText("show A"));

    expect(headers()).toEqual(["A"]);
    expect(renders.actionsOnly).toBe(1);
    // The control, proving a toast really did move through the provider.
    expect(renders.toastList).toBe(2);
  });

  it("does not re-render an actions-only consumer when a toast times out", () => {
    mountProbes();
    fireEvent.click(screen.getByText("show A"));

    act(() => {
      vi.advanceTimersByTime(TOAST_LIFETIME_MS);
    });

    expect(headers()).toEqual([]);
    expect(renders.actionsOnly).toBe(1);
    expect(renders.toastList).toBe(3);
  });
});
