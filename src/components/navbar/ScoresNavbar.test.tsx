import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { act } from "react";
import ScoresNavbar, { COLLAPSE_DURATION_MS } from "./ScoresNavbar";

const props = {
  view: "Scoreboard" as const,
  onViewChange: () => undefined,
  onRefresh: () => undefined,
  isRefreshing: false,
};

function liveWrapper() {
  return document.querySelector(".scores-nav__live");
}

describe("ScoresNavbar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("offers refresh for a week that is still open", () => {
    render(<ScoresNavbar {...props} isWeekLive />);

    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(liveWrapper()).not.toHaveClass("--collapsed");
  });

  it("puts refresh ahead of the switch, so the switch keeps its place", () => {
    render(<ScoresNavbar {...props} isWeekLive />);
    const names = Array.from(
      document.querySelectorAll<HTMLElement>(".scores-nav__button"),
    ).map((button) => button.getAttribute("aria-label") ?? button.textContent);

    expect(names).toEqual(["Refresh", "Scoreboard", "Picks"]);
  });

  it("marks them collapsed, and keeps them mounted, while they animate out", () => {
    const { rerender } = render(<ScoresNavbar {...props} isWeekLive />);

    rerender(<ScoresNavbar {...props} isWeekLive={false} />);

    // Still painted, so the transition has something to run on, but out of reach of
    // pointer, keyboard, and screen reader.
    expect(liveWrapper()).toHaveClass("--collapsed");
    expect(liveWrapper()).toHaveAttribute("inert");
    act(() => {
      vi.advanceTimersByTime(COLLAPSE_DURATION_MS - 1);
    });
    expect(liveWrapper()).toBeInTheDocument();
  });

  it("drops them and their divider once the collapse has run", () => {
    const { rerender } = render(<ScoresNavbar {...props} isWeekLive />);

    rerender(<ScoresNavbar {...props} isWeekLive={false} />);
    act(() => {
      vi.advanceTimersByTime(COLLAPSE_DURATION_MS);
    });

    expect(liveWrapper()).not.toBeInTheDocument();
    expect(
      document.querySelector(".scores-nav__divider"),
    ).not.toBeInTheDocument();
  });

  it("never renders them for a week that arrives decided", () => {
    render(<ScoresNavbar {...props} isWeekLive={false} />);

    expect(liveWrapper()).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Refresh" }),
    ).not.toBeInTheDocument();
  });

  it("carries the update glyph, not the outline refresh one it replaced", () => {
    render(<ScoresNavbar {...props} isWeekLive />);

    expect(screen.getByTestId("UpdateIcon")).toBeInTheDocument();
  });

  it("fires onRefresh when clicked", async () => {
    // No delay: the suite runs under fake timers for the collapse animation
    // above, which real userEvent delays would hang against.
    const user = userEvent.setup({ delay: null });
    const onRefresh = vi.fn();
    render(<ScoresNavbar {...props} isWeekLive onRefresh={onRefresh} />);

    await user.click(screen.getByRole("button", { name: "Refresh" }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("does not fire onRefresh while a refresh is already running", async () => {
    const user = userEvent.setup({ delay: null });
    const onRefresh = vi.fn();
    render(
      <ScoresNavbar {...props} isWeekLive isRefreshing onRefresh={onRefresh} />,
    );

    await user.click(screen.getByRole("button", { name: "Refresh" }));

    expect(onRefresh).not.toHaveBeenCalled();
  });
});
