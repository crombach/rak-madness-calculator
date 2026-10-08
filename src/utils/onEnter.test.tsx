import { fireEvent, render, screen } from "@testing-library/react";
import onEnter from "./onEnter";

describe("onEnter", () => {
  it("runs on Enter, but not on an input method's Enter", () => {
    const action = vi.fn();
    render(<input aria-label="Name" onKeyDown={onEnter(action)} />);
    const field = screen.getByRole("textbox", { name: "Name" });

    fireEvent.keyDown(field, { key: "Enter", isComposing: true });
    expect(action).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { key: "Enter" });
    expect(action).toHaveBeenCalledOnce();
  });
});
