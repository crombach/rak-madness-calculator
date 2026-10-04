import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import reloadForNewBuild from "./reloadForNewBuild";

describe("reloadForNewBuild", () => {
  const reload = vi.fn();
  const lost = new TypeError("Failed to fetch dynamically imported module");

  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("location", { ...window.location, reload });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    reload.mockReset();
  });

  it("reloads the page for a chunk a deploy removed", () => {
    void reloadForNewBuild(lost);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("leaves a tab offline as it is, since a reload would lose the app", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await expect(reloadForNewBuild(lost)).rejects.toBe(lost);
    expect(reload).not.toHaveBeenCalled();
  });

  it("leaves a module that threw as it is, since the new build has it too", async () => {
    const thrown = new RangeError("Invalid time value");
    await expect(reloadForNewBuild(thrown)).rejects.toBe(thrown);
    expect(reload).not.toHaveBeenCalled();
  });

  it("gives up rather than reload again moments later", async () => {
    void reloadForNewBuild(lost);
    await expect(reloadForNewBuild(lost)).rejects.toBe(lost);
    expect(reload).toHaveBeenCalledOnce();
  });
});
