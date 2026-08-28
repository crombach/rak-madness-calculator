import observeResize from "./observeResize";
import doNothing from "./doNothing";

/**
 * The stub `setupTests.ts` installs. Put back after every case, because two of these
 * replace it and one takes it away, and no other suite should meet either.
 */
const STUB = globalThis.ResizeObserver;

afterEach(() => {
  globalThis.ResizeObserver = STUB;
});

/** What one observer was asked to watch, and whether it was let go. */
type Built = { targets: Array<Element>; disconnected: boolean };

/** Stands in for `ResizeObserver` and keeps every observer built through it. */
function recordObservers(): Array<Built> {
  const built: Array<Built> = [];
  globalThis.ResizeObserver = class {
    private readonly own: Built = { targets: [], disconnected: false };

    constructor() {
      built.push(this.own);
    }

    observe(target: Element): void {
      this.own.targets.push(target);
    }

    unobserve(): void {}

    disconnect(): void {
      this.own.disconnected = true;
    }
  };
  return built;
}

describe("observeResize", () => {
  it("watches every element it was handed, in one observer, skipping the gaps", () => {
    const built = recordObservers();
    const table = document.createElement("table");
    const box = document.createElement("div");
    observeResize([table, null, box, undefined], doNothing);
    expect(built).toHaveLength(1);
    expect(built[0].targets).toEqual([table, box]);
  });

  it("lets the observer go when its disposer is called", () => {
    const built = recordObservers();
    const unobserve = observeResize([document.createElement("div")], doNothing);
    expect(built[0].disconnected).toBe(false);
    unobserve();
    expect(built[0].disconnected).toBe(true);
  });

  it("builds nothing where there is no element to watch yet", () => {
    const built = recordObservers();
    const unobserve = observeResize([null, undefined], doNothing);
    expect(built).toEqual([]);
    expect(unobserve).not.toThrow();
  });

  it("builds nothing in a runtime that ships no ResizeObserver, and still undoes", () => {
    delete (globalThis as Partial<typeof globalThis>).ResizeObserver;
    const unobserve = observeResize([document.createElement("div")], doNothing);
    expect(unobserve).not.toThrow();
  });
});
