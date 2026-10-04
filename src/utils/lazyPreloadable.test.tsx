import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import lazyPreloadable from "./lazyPreloadable";

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

it("reloads the page when a deploy removed the page's chunk", async () => {
  const reload = vi.fn();
  vi.stubGlobal("location", { ...window.location, reload });
  const { Page } = lazyPreloadable<object>(
    () =>
      Promise.reject(
        new TypeError("Failed to fetch dynamically imported module"),
      ),
    <p>Loading</p>,
  );
  render(<Page />);
  await vi.waitFor(() => expect(reload).toHaveBeenCalledOnce());
  expect(screen.getByText("Loading")).toBeInTheDocument();
});
