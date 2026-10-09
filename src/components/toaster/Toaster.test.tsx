import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import {
  Toast,
  ToastContextProvider,
  ToastType,
  useToastActions,
} from "../../context/ToastContext";
import Toaster from "./Toaster";

/** Shows one toast per click, so tests can queue them from the outside. */
function ShowToastButton({ toast }: { toast: Toast }) {
  const { showToast } = useToastActions();
  return <button onClick={() => showToast(toast)}>show {toast.header}</button>;
}

function mountToaster(...toasts: Array<Toast>) {
  return render(
    <ToastContextProvider>
      {toasts.map((toast) => (
        <ShowToastButton key={toast.id} toast={toast} />
      ))}
      <Toaster />
    </ToastContextProvider>,
  );
}

async function show(header: string) {
  await userEvent.click(screen.getByRole("button", { name: `show ${header}` }));
}

describe("Toaster", () => {
  it("renders a toast's message when shown", async () => {
    mountToaster(new Toast("neutral", "Alice", "Winner!"));
    await show("Alice");
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Winner!")).toBeInTheDocument();
  });

  it("renders one live region per queued toast", async () => {
    mountToaster(
      new Toast("neutral", "Alice", "Winner!"),
      new Toast("neutral", "Bob", "Knocked out."),
    );
    await show("Alice");
    await show("Bob");
    expect(screen.getAllByRole("status")).toHaveLength(2);
  });

  it("interrupts for a toast that waits to be dismissed, and not otherwise", async () => {
    mountToaster(
      new Toast("neutral", "Alice", "Winner!"),
      new Toast("danger", "Bob", "Scoring failed."),
    );

    await show("Alice");
    expect(screen.queryByRole("alert")).toBeNull();

    await show("Bob");
    expect(screen.getByRole("alert")).toHaveTextContent("Scoring failed.");
  });

  it("dismisses a toast when its close button is clicked", async () => {
    mountToaster(new Toast("neutral", "Alice", "Winner!"));
    await show("Alice");
    const [, closeButton] = screen.getAllByRole("button");
    await userEvent.click(closeButton);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps a dismissed toast, inert, until its exit has played", async () => {
    mountToaster(new Toast("neutral", "Alice", "Winner!"));
    await show("Alice");
    const [, closeButton] = screen.getAllByRole("button");
    await userEvent.click(closeButton);
    expect(screen.getByText("Winner!")).toBeInTheDocument();
    expect(screen.getByText("Winner!").closest(".toast-slot")).toHaveAttribute(
      "inert",
    );
    await waitFor(() =>
      expect(screen.queryByText("Winner!")).not.toBeInTheDocument(),
    );
  });

  it.each([
    ["success", "CheckCircleIcon"],
    ["danger", "ReportIcon"],
    ["warning", "WarningIcon"],
    ["neutral", "InfoIcon"],
  ])("shows the %s icon", async (type, iconTestId) => {
    mountToaster(new Toast(type as ToastType, "Header", "Message"));
    await show("Header");
    expect(screen.getByTestId(iconTestId)).toBeInTheDocument();
  });

  describe("exits", () => {
    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: false }));
    afterEach(() => vi.useRealTimers());

    function dismissButton(header: string) {
      const toast = screen.getByText(header).closest(".toast") as HTMLElement;
      return within(toast).getByRole("button", { name: "Dismiss" });
    }

    it("removes each toast 200ms after its own dismissal", () => {
      const toasts = ["A", "B", "C"].map(
        (h) => new Toast("neutral", h, `${h} msg`),
      );
      render(
        <ToastContextProvider>
          {toasts.map((toast) => (
            <ShowToastButton key={toast.id} toast={toast} />
          ))}
          <Toaster />
        </ToastContextProvider>,
      );
      for (const h of ["A", "B", "C"]) {
        fireEvent.click(screen.getByRole("button", { name: `show ${h}` }));
      }

      fireEvent.click(dismissButton("A"));
      act(() => void vi.advanceTimersByTime(150));
      fireEvent.click(dismissButton("B"));
      act(() => void vi.advanceTimersByTime(49));
      expect(screen.getByText("A msg")).toBeInTheDocument();
      act(() => void vi.advanceTimersByTime(1));
      expect(screen.queryByText("A msg")).not.toBeInTheDocument();
      expect(screen.getByText("B msg")).toBeInTheDocument();
      act(() => void vi.advanceTimersByTime(149));
      expect(screen.getByText("B msg")).toBeInTheDocument();
      act(() => void vi.advanceTimersByTime(1));
      expect(screen.queryByText("B msg")).not.toBeInTheDocument();
      expect(screen.getByText("C msg")).toBeInTheDocument();
    });

    it("does not keep a leaving toast mounted while new ones arrive", () => {
      const early = new Toast("neutral", "Early", "Early msg");
      const late = Array.from(
        { length: 6 },
        (_, i) => new Toast("neutral", `L${i}`, `L${i} msg`),
      );
      render(
        <ToastContextProvider>
          {[early, ...late].map((toast) => (
            <ShowToastButton key={toast.id} toast={toast} />
          ))}
          <Toaster />
        </ToastContextProvider>,
      );
      fireEvent.click(screen.getByRole("button", { name: "show Early" }));
      fireEvent.click(dismissButton("Early"));
      for (let i = 0; i < late.length; i++) {
        act(() => void vi.advanceTimersByTime(50));
        fireEvent.click(screen.getByRole("button", { name: `show L${i}` }));
      }
      expect(screen.queryByText("Early msg")).not.toBeInTheDocument();
    });
  });
});
