import { act, renderHook } from "@testing-library/react";
import useMediaQuery from "./useMediaQuery";
import { stubMatchMedia } from "../setupTests";

const QUERY = "(max-width: 480px)";

describe("useMediaQuery", () => {
  it("reports the answer the browser gives now", () => {
    stubMatchMedia(true);

    expect(renderHook(() => useMediaQuery(QUERY)).result.current).toBe(true);
  });

  it("reports it again when the answer changes", () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery(QUERY));

    act(() => media.answer(true));

    expect(result.current).toBe(true);
  });

  it("stops listening once it is gone", () => {
    const media = stubMatchMedia(false);

    renderHook(() => useMediaQuery(QUERY)).unmount();

    expect(media.listeners.size).toBe(0);
  });
});
