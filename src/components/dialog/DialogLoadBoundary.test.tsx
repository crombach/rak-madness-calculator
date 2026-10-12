import { render, screen } from "@testing-library/react";
import DialogLoadBoundary from "./DialogLoadBoundary";

function Throws(): never {
  throw new Error("Failed to fetch dynamically imported module");
}

describe("DialogLoadBoundary", () => {
  it("holds a dialog that cannot be fetched, and says so once", () => {
    // React reports a caught error itself, which is noise here rather than a
    // failure.
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();

    const { container } = render(
      <DialogLoadBoundary onError={onError}>
        <Throws />
      </DialogLoadBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    // Nothing drawn in place of the dialog. The reload the reason asks for is
    // the way out, so a half-drawn dialog would only be something to click.
    expect(container).toBeEmptyDOMElement();
    logged.mockRestore();
  });

  it("stays out of the way of a dialog that loads", () => {
    const onError = vi.fn();

    render(
      <DialogLoadBoundary onError={onError}>
        <p>Player analysis</p>
      </DialogLoadBoundary>,
    );

    expect(screen.getByText("Player analysis")).toBeInTheDocument();
    expect(onError).not.toHaveBeenCalled();
  });
});
