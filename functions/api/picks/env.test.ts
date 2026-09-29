import { afterEach, describe, expect, it, vi } from "vitest";
import { cachedGet } from "./env";
import { makeContext, stubCache } from "./testHelpers";

const URL_ = "https://example.test/api/picks/2025/1";

function context() {
  return makeContext({ request: new Request(URL_) });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("cachedGet", () => {
  it("answers from the cache without building", async () => {
    const hit = new Response("cached");
    stubCache({ match: async () => hit });
    const build = vi.fn(async () => new Response("built"));

    const response = await cachedGet(context(), build);

    expect(await response.text()).toBe("cached");
    expect(build).not.toHaveBeenCalled();
  });

  it("stores a 200 and still returns its body", async () => {
    const cache = stubCache();
    const ctx = context();

    const response = await cachedGet(
      ctx,
      async () => new Response("picks", { status: 200 }),
    );
    await ctx.settle();

    expect(await response.text()).toBe("picks");
    expect(cache.put).toHaveBeenCalledTimes(1);
    const [, stored] = cache.put.mock.calls[0] as [Request, Response];
    expect(await stored.text()).toBe("picks");
  });

  it.each([304, 404, 503])("does not store a %i", async (status) => {
    const cache = stubCache();
    const ctx = context();

    const response = await cachedGet(
      ctx,
      async () => new Response(null, { status }),
    );
    await ctx.settle();

    expect(response.status).toBe(status);
    expect(cache.put).not.toHaveBeenCalled();
  });

  it("returns the response when the cache write fails", async () => {
    stubCache({
      put: async () => {
        throw new Error("413");
      },
    });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const ctx = context();

    const response = await cachedGet(ctx, async () => new Response("picks"));
    await expect(ctx.settle()).resolves.toBeDefined();

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("picks");
    expect(errorLog).toHaveBeenCalled();
  });
});
