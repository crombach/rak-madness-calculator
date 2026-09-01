import { renderHook } from "@testing-library/react";
import useArrival from "./useArrival";

const onArrive = vi.fn();

describe("useArrival", () => {
  it("takes a value that is already there on the first render", () => {
    // The case a lazily mounted dialog is in. It is rendered for the first time
    // by the click that names the player, so the name is on the first render and
    // there is no earlier one to compare it with.
    renderHook(() => useArrival("Alice", onArrive));

    expect(onArrive).toHaveBeenCalledWith("Alice");
  });

  it("takes a value that arrives after the first render", () => {
    const { rerender } = renderHook(
      ({ named }: { named?: string }) => useArrival(named, onArrive),
      { initialProps: {} },
    );
    expect(onArrive).not.toHaveBeenCalled();

    rerender({ named: "Bobby" });

    expect(onArrive).toHaveBeenCalledWith("Bobby");
  });

  it("takes each new value once, and ignores the value being cleared", () => {
    const { rerender } = renderHook(
      ({ named }: { named?: string }) => useArrival(named, onArrive),
      { initialProps: { named: "Alice" } as { named?: string } },
    );

    rerender({ named: "Alice" });
    rerender({ named: "Bobby" });
    // A dialog clears the name on its way out, and taking that would empty it
    // while it is still fading.
    rerender({ named: undefined });

    expect(onArrive).toHaveBeenCalledTimes(2);
    expect(onArrive).toHaveBeenLastCalledWith("Bobby");
  });
});
