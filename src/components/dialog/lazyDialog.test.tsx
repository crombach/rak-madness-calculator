import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ToastContextProvider } from "../../context/ToastContext";
import Toaster from "../toaster/Toaster";
import lazyDialog, { DIALOG_LOAD_ERROR } from "./lazyDialog";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

function renderDialog(Dialog: (props: Props) => React.ReactNode) {
  const onOpenChange = vi.fn();
  const view = render(
    <ToastContextProvider>
      <Dialog open={false} onOpenChange={onOpenChange} />
      <Toaster />
    </ToastContextProvider>,
  );
  const setOpen = (open: boolean) =>
    view.rerender(
      <ToastContextProvider>
        <Dialog open={open} onOpenChange={onOpenChange} />
        <Toaster />
      </ToastContextProvider>,
    );
  return { onOpenChange, setOpen };
}

describe("lazyDialog", () => {
  it("draws the dialog once its chunk is in", async () => {
    const { Dialog } = lazyDialog<Props>(() =>
      Promise.resolve({
        default: ({ open }: Props) => (open ? <p>Settings</p> : null),
      }),
    );
    const { setOpen } = renderDialog(Dialog);

    setOpen(true);

    expect(await screen.findByText("Settings")).toBeInTheDocument();
  });

  it("toasts and closes on a failed chunk, on every open", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    const { Dialog } = lazyDialog<Props>(() =>
      Promise.reject(new Error("chunk gone")),
    );
    const { onOpenChange, setOpen } = renderDialog(Dialog);

    setOpen(true);
    expect(await screen.findByText(DIALOG_LOAD_ERROR)).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    setOpen(false);
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() =>
      expect(screen.queryByText(DIALOG_LOAD_ERROR)).not.toBeInTheDocument(),
    );

    setOpen(true);
    expect(await screen.findByText(DIALOG_LOAD_ERROR)).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });
});
