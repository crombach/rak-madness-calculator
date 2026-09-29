import { act, renderHook, waitFor } from "@testing-library/react";
import useLatestAsync from "./useLatestAsync";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useLatestAsync", () => {
  it("is idle without a load", () => {
    const { result } = renderHook(() => useLatestAsync(undefined, vi.fn()));
    expect(result.current).toEqual({ data: undefined, status: "idle" });
  });

  it("keeps only the newest answer, whatever order they land in", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const loadFirst = () => first.promise;
    const loadSecond = () => second.promise;
    const { result, rerender } = renderHook(
      ({ load }) => useLatestAsync(load, vi.fn()),
      { initialProps: { load: loadFirst } },
    );
    expect(result.current.status).toBe("loading");

    rerender({ load: loadSecond });
    await act(async () => second.resolve("second"));
    await act(async () => first.resolve("first"));

    expect(result.current).toEqual({ data: "second", status: "success" });
  });

  it("drops the data and reports a failure", async () => {
    const onError = vi.fn();
    const failure = new Error("down");
    const load = () => Promise.reject(failure);
    const { result } = renderHook(() => useLatestAsync(load, onError));
    await waitFor(() => expect(onError).toHaveBeenCalledWith(failure));
    expect(result.current).toEqual({ data: undefined, status: "error" });
  });
});
