import { act, renderHook } from "@testing-library/react";
import { useRef } from "react";
import usePullToRefresh, {
  lockAxis,
  Pull,
  PULL_PHASE_ATTR,
  PULL_MAX_PX,
  PULL_SLOP_PX,
  PULL_TRIGGER_PX,
  pullOffset,
} from "./usePullToRefresh";

describe("lockAxis", () => {
  it("says nothing until the finger has left the slop", () => {
    expect(lockAxis(PULL_SLOP_PX - 1, PULL_SLOP_PX - 1)).toBe("undecided");
  });

  it("takes a move straight down as the pull", () => {
    expect(lockAxis(0, 20)).toBe("pull");
  });

  it("gives a sideways pan to the table, which is wider than the phone", () => {
    expect(lockAxis(20, 0)).toBe("abandoned");
  });

  it("gives a diagonal to the table as well", () => {
    expect(lockAxis(15, 20)).toBe("abandoned");
  });

  it("never arms on a flick upwards", () => {
    expect(lockAxis(0, -20)).toBe("abandoned");
  });
});

describe("pullOffset", () => {
  it("moves nothing for a finger that has not moved down", () => {
    expect(pullOffset(0)).toBe(0);
    expect(pullOffset(-40)).toBe(0);
  });

  it("tracks the finger one to one up to the trigger", () => {
    expect(pullOffset(40)).toBe(40);
    expect(pullOffset(PULL_TRIGGER_PX)).toBe(PULL_TRIGGER_PX);
  });

  it("resists past the trigger without ever reaching the maximum", () => {
    expect(pullOffset(200)).toBeGreaterThan(PULL_TRIGGER_PX);
    expect(pullOffset(200)).toBeLessThan(PULL_MAX_PX);
    expect(pullOffset(100_000)).toBeLessThan(PULL_MAX_PX);
  });

  it("only ever grows", () => {
    for (let distance = 0; distance < 400; distance += 7) {
      expect(pullOffset(distance + 7)).toBeGreaterThan(pullOffset(distance));
    }
  });
});

/**
 * jsdom ships no `TouchEvent` constructor and lays nothing out, so the touches and
 * the box's scroll position are both stood up by hand.
 */
function touch(type: string, x: number, y: number): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  return Object.assign(event, {
    touches: type === "touchend" ? [] : [{ clientX: x, clientY: y }],
  });
}

function mount(pull: Pull) {
  const box = document.createElement("div");
  document.body.append(box);
  Object.defineProperty(box, "scrollTop", { value: 0, writable: true });
  const view = renderHook(
    (props: { pull: Pull }) => {
      const ref = useRef(box);
      return usePullToRefresh({ scrollRef: ref, pull: props.pull });
    },
    { initialProps: { pull } },
  );
  return { box, view };
}

describe("usePullToRefresh", () => {
  const realMatchMedia = window.matchMedia;
  beforeEach(() => {
    // The gesture is a phone's, and jsdom answers no to every query by default.
    window.matchMedia = ((media: string) => ({
      media,
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })) as unknown as typeof window.matchMedia;
  });
  afterEach(() => {
    window.matchMedia = realMatchMedia;
    document.documentElement.removeAttribute(PULL_PHASE_ATTR);
    document.body.replaceChildren();
  });

  it("refreshes on a pull past the trigger", () => {
    const onRefresh = vi.fn();
    const { box } = mount({ onRefresh, isRefreshing: false });

    act(() => {
      box.dispatchEvent(touch("touchstart", 100, 100));
      box.dispatchEvent(touch("touchmove", 100, 140));
      box.dispatchEvent(touch("touchmove", 100, 100 + PULL_TRIGGER_PX + 10));
      box.dispatchEvent(touch("touchend", 0, 0));
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(document.documentElement.getAttribute(PULL_PHASE_ATTR)).toBe(
      "refreshing",
    );
  });

  it("springs back from a pull that stopped short", () => {
    const onRefresh = vi.fn();
    const { box } = mount({ onRefresh, isRefreshing: false });

    act(() => {
      box.dispatchEvent(touch("touchstart", 100, 100));
      box.dispatchEvent(touch("touchmove", 100, 130));
      box.dispatchEvent(touch("touchend", 0, 0));
    });

    expect(onRefresh).not.toHaveBeenCalled();
    expect(document.documentElement.getAttribute(PULL_PHASE_ATTR)).toBe(
      "settling",
    );
  });

  it("leaves a sideways pan to the table, and takes a pull off it", () => {
    const { box } = mount({ onRefresh: vi.fn(), isRefreshing: false });

    const pan = touch("touchmove", 160, 102);
    const pull = touch("touchmove", 100, 160);
    act(() => {
      box.dispatchEvent(touch("touchstart", 100, 100));
      box.dispatchEvent(pan);
    });
    act(() => {
      box.dispatchEvent(touch("touchend", 0, 0));
      box.dispatchEvent(touch("touchstart", 100, 100));
      box.dispatchEvent(pull);
    });

    expect(pan.defaultPrevented).toBe(false);
    expect(pull.defaultPrevented).toBe(true);
  });

  it("ignores a touch that starts partway down the table", () => {
    const onRefresh = vi.fn();
    const { box } = mount({ onRefresh, isRefreshing: false });
    (box as unknown as { scrollTop: number }).scrollTop = 200;

    act(() => {
      box.dispatchEvent(touch("touchstart", 100, 100));
      box.dispatchEvent(touch("touchmove", 100, 300));
      box.dispatchEvent(touch("touchend", 0, 0));
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });
});
