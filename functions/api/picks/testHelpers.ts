import { vi } from "vitest";

/** Just what `cachedGet` asks of the colo cache. */
export type FakeCache = {
  match: (request: Request) => Promise<Response | undefined>;
  put: (request: Request, response: Response) => Promise<void>;
};

/** Installs a `caches.default` the test controls, and returns it. */
export function stubCache(overrides: Partial<FakeCache> = {}): {
  match: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
} {
  const cache = {
    match: vi.fn(overrides.match ?? (async () => undefined)),
    put: vi.fn(overrides.put ?? (async () => undefined)),
  };
  vi.stubGlobal("caches", { default: cache });
  return cache;
}

/** A context whose `waitUntil` keeps the promises so a test can await them. */
export function makeContext<Extra extends object>(
  extra: Extra & {
    request: Request;
  },
) {
  const pending: Array<Promise<unknown>> = [];
  return {
    ...extra,
    waitUntil: (promise: Promise<unknown>) => {
      pending.push(promise);
    },
    settle: () => Promise.all(pending),
  };
}
