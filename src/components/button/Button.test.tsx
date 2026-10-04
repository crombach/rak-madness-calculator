import { fireEvent, render, screen } from "@testing-library/react";
import doNothing from "../../utils/doNothing";
import Button from "./Button";

function key() {
  render(
    <Button selected={false} onClick={doNothing}>
      Show Leader
    </Button>,
  );
  return screen.getByRole("button", { name: "Show Leader" });
}

describe("Button", () => {
  it("marks a key released once a finger lifts off it", () => {
    const button = key();

    fireEvent.pointerDown(button, { pointerType: "touch" });
    expect(button).not.toHaveAttribute("data-released");

    fireEvent.pointerUp(button, { pointerType: "touch" });
    expect(button).toHaveAttribute("data-released");

    fireEvent.pointerDown(button, { pointerType: "touch" });
    expect(button).not.toHaveAttribute("data-released");
  });

  it("shows a key press again after a finger lifted", () => {
    const button = key();
    fireEvent.pointerUp(button, { pointerType: "touch" });

    fireEvent.keyDown(button, { key: " " });

    expect(button).not.toHaveAttribute("data-released");
  });

  it("leaves a mouse press to the browser", () => {
    const button = key();

    fireEvent.pointerDown(button, { pointerType: "mouse" });
    fireEvent.pointerUp(button, { pointerType: "mouse" });

    expect(button).not.toHaveAttribute("data-released");
  });
});
