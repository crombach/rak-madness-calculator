import { render, screen, waitFor } from "@testing-library/react";
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

  it("keeps a dismissed toast, hidden, until its exit has played", async () => {
    mountToaster(new Toast("neutral", "Alice", "Winner!"));
    await show("Alice");
    const [, closeButton] = screen.getAllByRole("button");
    await userEvent.click(closeButton);
    expect(screen.getByText("Winner!")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
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
});
