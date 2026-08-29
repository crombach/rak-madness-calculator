import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  PickResult,
  PlayerScore,
  RakMadnessScores,
} from "../../types/RakMadnessScores";
import { playerScore } from "../../weekFixtures";
import PlayerAnalysisDialog, { playerOptions } from "./PlayerAnalysisDialog";

function proPick(pick: string): PickResult {
  return {
    pick,
    status: "incomplete",
    explanation: { header: "", message: "" },
  };
}

function player(
  name: string,
  total: number,
  pick: string,
  explanation?: string,
): PlayerScore {
  return playerScore({
    name,
    score: { total, college: 0, pro: total, proAgainstTheSpread: 0 },
    tiebreaker: {},
    pro: [proPick(pick)],
    status: {
      hasNoPicks: false,
      isKnockedOut: explanation != null,
      explanation,
    },
  });
}

/**
 * Two players level on points with one game left, which they picked opposite
 * ways, and a third already out of it.
 */
const scores: RakMadnessScores = {
  scores: [
    player("Alice", 3, "KC -3"),
    player("Bob", 3, "DEN +3"),
    player("Bobby", 0, "DEN +3", "Knocked out on Total Score by Alice."),
  ],
};

describe("playerOptions", () => {
  it("has nobody to offer before a week is scored", () => {
    expect(playerOptions(undefined)).toEqual([]);
  });
});

/*
 * One mounted dialog for the whole file, on purpose.
 *
 * Base UI hangs its scroll lock, focus guards, and inert markers off the document
 * while a dialog is open, and mounting a second one leaves the previous set behind.
 * Every other case in a file that mounts several then types into an input those
 * leftovers have put out of reach. The app never does this: `ResultsFrame` holds
 * one dialog and toggles `open` on it.
 *
 * So this covers the wiring once, and what each result reads like is covered
 * against `AnalysisSummary` instead.
 */
describe("PlayerAnalysisDialog", () => {
  it("answers for the player picked from the search, and for one named", async () => {
    const user = userEvent.setup();
    // The analysis waits for a frame before it runs, so the frames are held here and
    // let go by hand. Left to the machine's own timing, whether the bar that says the
    // search is under way is still up by the time it is looked for comes down to how
    // long the click before it took.
    const frames: Array<FrameRequestCallback> = [];
    const frame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((run) => frames.push(run));
    const { rerender } = render(
      <PlayerAnalysisDialog
        open
        onOpenChange={() => undefined}
        scores={scores}
      />,
    );

    const search = screen.getByRole("combobox", { name: "Player" });
    await user.type(search, "zzz");
    expect(await screen.findByText("No matching players")).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "Ali");
    await user.click(await screen.findByRole("option", { name: "Alice" }));

    // Picking puts the mark back beside the input, in the same pass the name
    // lands in it.
    expect(
      document.querySelector(".player-analysis__input-status"),
    ).toBeInTheDocument();

    // Announced as busy while the search runs, on the region a screen reader
    // reads politely once the answer replaces it.
    expect(
      screen.getByRole("progressbar", { name: "Working out the paths" }),
    ).toHaveAttribute("aria-busy", "true");
    expect(document.querySelector(".dialog__body [aria-live]")).toHaveAttribute(
      "aria-live",
      "polite",
    );

    // The search runs a frame after the bar that says it is under way.
    frames.forEach((run) => run(0));
    frame.mockRestore();
    const mustWin = await screen.findByRole("heading", { name: "Must win" });
    // The bar goes with the answer arriving, rather than sitting over it.
    expect(screen.queryByRole("progressbar")).toBeNull();
    const pick = within(mustWin.parentElement as HTMLElement).getByRole(
      "listitem",
    );
    expect(pick).toHaveTextContent("P1");
    expect(pick).toHaveTextContent("KC -3");

    // A name from outside stands in for the same choice, knocked out or not.
    rerender(
      <PlayerAnalysisDialog
        open
        onOpenChange={() => undefined}
        player="Bobby"
        scores={scores}
      />,
    );

    expect(
      await screen.findByText("Knocked out on Total Score by Alice."),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Player" })).toHaveValue(
      "Bobby",
    );

    // Closing takes that name away again. Nothing here goes with it, since the
    // answer and the search are still on screen for as long as the fade runs.
    rerender(
      <PlayerAnalysisDialog
        open
        onOpenChange={() => undefined}
        scores={scores}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Player" })).toHaveValue(
      "Bobby",
    );
    expect(
      screen.getByText("Knocked out on Total Score by Alice."),
    ).toBeInTheDocument();

    // Opened on that same player twice running, with something half typed into the
    // search in between. The name arriving is still a change, so it wins.
    await user.clear(screen.getByRole("combobox", { name: "Player" }));
    await user.type(screen.getByRole("combobox", { name: "Player" }), "Ali");
    rerender(
      <PlayerAnalysisDialog
        open
        onOpenChange={() => undefined}
        player="Bobby"
        scores={scores}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Player" })).toHaveValue(
      "Bobby",
    );

    // Typing above left the list open, which in the app it never is when a name
    // arrives: the dialog is modal, so the table that names one is out of reach
    // until it closes and takes the search with it.
    await user.keyboard("{Escape}");

    // Tapping the search is the start of looking someone else up, so the name in
    // it goes and everyone is offered again. The answer stays on the player it was
    // opened on until another one is picked.
    await user.click(screen.getByRole("combobox", { name: "Player" }));

    expect(screen.getByRole("combobox", { name: "Player" })).toHaveValue("");
    expect(
      (await screen.findAllByRole("option")).map((it) => it.textContent),
    ).toEqual(["Alice", "Bob", "Bobby"]);
    expect(
      screen.getByText("Knocked out on Total Score by Alice."),
    ).toBeInTheDocument();
    // The mark beside the input speaks for the name that was in it, so it goes
    // with the name rather than standing over an empty search.
    expect(document.querySelector(".player-analysis__input-status")).toBeNull();

    // The press is the whole field, not the input alone. The trigger stretched
    // over it is what the chevron, the mark, and the padding around them all
    // reach, and it opens the list the same way a press on the input does.
    await user.keyboard("{Escape}");
    const field = document.querySelector<HTMLElement>(
      ".dialog__search-trigger",
    );
    expect(field).not.toBeNull();
    await user.click(field!);

    expect(
      (await screen.findAllByRole("option")).map((it) => it.textContent),
    ).toEqual(["Alice", "Bob", "Bobby"]);
    expect(screen.getByRole("combobox", { name: "Player" })).toHaveValue("");

    // Dismissing puts the chosen name back, since the answer below is still that
    // player's.
    await user.keyboard("{Escape}");
    expect(screen.getByRole("combobox", { name: "Player" })).toHaveValue(
      "Bobby",
    );
    expect(
      document.querySelector(".player-analysis__input-status"),
    ).toBeInTheDocument();

    // Only a press empties the search. A letter typed into it opens the list too,
    // and wiping on that would take the letter that opened it. Typed straight at
    // the focused input, since `user.type` clicks first and would open by press.
    await user.keyboard("x");

    expect(screen.getByRole("combobox", { name: "Player" })).toHaveValue(
      "Bobbyx",
    );
    // Half a name reaches nobody yet, so there is nobody for the mark to speak
    // for until the next one is picked.
    expect(document.querySelector(".player-analysis__input-status")).toBeNull();
  });
});
