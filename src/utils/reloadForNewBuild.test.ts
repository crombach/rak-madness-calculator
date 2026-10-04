import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import reloadForNewBuild from "./reloadForNewBuild";

describe("reloadForNewBuild", () => {
  const reload = vi.fn();
  const lost = new Error("Failed to fetch dynamically imported module");

  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("location", { ...window.location, reload });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    reload.mockReset();
  });

  it("reloads the page for a chunk a deploy removed", () => {
    void reloadForNewBuild(lost);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("gives up rather than reload again moments later", async () => {
    void reloadForNewBuild(lost);
    await expect(reloadForNewBuild(lost)).rejects.toBe(lost);
    expect(reload).toHaveBeenCalledOnce();
  });
});
