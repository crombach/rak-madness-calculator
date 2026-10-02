import { screen, waitFor } from "@testing-library/react";

vi.mock("../../utils/getLeagueInfo");
vi.mock("../../utils/readFileToBuffer");
vi.mock("../../utils/scoring/getPlayerScores");
vi.mock("../../utils/buildSpreadsheetBuffer");

// The page's code and the knockouts' own, each held back until the test lets it
// arrive, so the week lands first, then the page, then what it reads.
const held = vi.hoisted(() => {
  function gate() {
    let release = () => {};
    const arrived = new Promise<void>((resolve) => (release = resolve));
    return { arrived, release };
  }
  return { page: gate(), knockouts: gate() };
});
vi.mock("../knockouts/KnockoutsRoute", async (importOriginal) => {
  await held.page.arrived;
  return importOriginal();
});
vi.mock("../../utils/scoring/getKnockouts", async (importOriginal) => {
  await held.knockouts.arrived;
  return importOriginal();
});

import {
  CURRENT_WEEK,
  SEASON,
  getPlayerScoresMock,
  mountApp,
  setUpAppTest,
  spreadsheetResponse,
} from "../../appTestFixtures";
import { EXPERIMENTAL_FEATURES_KEY } from "../../context/SettingsContext";
import { League } from "../../types/League";
import { pick, player, week } from "../../utils/scoring/scoringTestFixtures";

const SKELETON = ".knockouts.--loading";
const PAGE = ".knockouts:not(.--loading)";

beforeEach(() => {
  setUpAppTest().mockResolvedValue(spreadsheetResponse());
  localStorage.setItem(EXPERIMENTAL_FEATURES_KEY, "on");
  const scores = week([
    player({ name: "Alice", total: 5, pro: [pick("KC -3")] }),
    player({ name: "Bob", total: 5, pro: [pick("DEN 3")] }),
  ]);
  scores.games = [{ label: "P1", league: League.PRO, name: "KC at DEN" }];
  getPlayerScoresMock.mockResolvedValue(scores);
});

it("keeps one wireframe up until the page can stand in its place", async () => {
  // A set, since a node and the tree it went in with can land in one batch.
  const mounted = new Set<Element>();
  // Whether the page stood in the wireframe's place as it went, checked before
  // anything later can paint.
  const handedOff: Array<boolean> = [];
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.removedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches(SKELETON) || node.querySelector(SKELETON)) {
          handedOff.push(document.querySelector(PAGE) != null);
        }
      }
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches(SKELETON)) mounted.add(node);
        node.querySelectorAll(SKELETON).forEach((it) => mounted.add(it));
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  mountApp(`/${SEASON}/${CURRENT_WEEK}/knockouts`);
  await waitFor(() => expect(getPlayerScoresMock).toHaveBeenCalled());
  // Past the week landing, so a handoff would have happened by now.
  await new Promise((resolve) => setTimeout(resolve, 50));
  held.page.release();
  await new Promise((resolve) => setTimeout(resolve, 50));
  held.knockouts.release();
  await screen.findByText("KC at DEN");
  observer.disconnect();

  expect(mounted.size).toBe(1);
  expect(handedOff).toEqual([true]);
});
