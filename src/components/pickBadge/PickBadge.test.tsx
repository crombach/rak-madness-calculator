import { render, screen } from "@testing-library/react";
import PickBadge from "./PickBadge";

describe("PickBadge", () => {
  it.each([
    [undefined, []],
    ["scored", ["--scored"]],
    ["missed", ["--missed"]],
  ] as const)("marks a pick whose outcome is %s", (outcome, classes) => {
    render(<PickBadge pick="SF +6" outcome={outcome} />);
    const badge = screen.getByText("SF +6");
    expect(
      badge.className.split(" ").filter((c) => c.startsWith("--")),
    ).toEqual(classes);
  });
});
