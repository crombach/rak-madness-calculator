import cachedImport from "./cachedImport";

describe("cachedImport", () => {
  it("loads once for every caller", async () => {
    const load = vi.fn(async () => "module");
    const get = cachedImport(load);

    await Promise.all([get(), get()]);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("asks again after a failed load", async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("chunk gone"))
      .mockResolvedValueOnce("module");
    const get = cachedImport(load);

    await expect(get()).rejects.toThrow("chunk gone");

    await expect(get()).resolves.toBe("module");
  });
});
