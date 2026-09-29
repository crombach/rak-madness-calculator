import { renderHook } from "@testing-library/react";
import { PropsWithChildren } from "react";
import {
  PLAYER_NAME_KEY,
  SettingsContextProvider,
} from "../context/SettingsContext";
import { League } from "../types/League";
import { RakMadnessScores } from "../types/RakMadnessScores";
import { pick, player } from "../utils/scoring/scoringTestFixtures";
import useMyPick from "./useMyPick";

const scores: RakMadnessScores = {
  scores: [
    player({ name: "Bob", pro: [pick("BUF")] }),
    player({ name: "Alice", pro: [pick("KC -3"), pick(" ")] }),
  ],
};
const P1 = { label: "P1", league: League.PRO, name: "KC at BUF" };
const P2 = { label: "P2", league: League.PRO, name: "DEN at LV" };

function Settings({ children }: PropsWithChildren) {
  return <SettingsContextProvider>{children}</SettingsContextProvider>;
}

function myPick(game: typeof P1) {
  return renderHook(() => useMyPick(scores, game), { wrapper: Settings }).result
    .current;
}

describe("useMyPick", () => {
  beforeEach(() => localStorage.clear());

  it("finds the pick of the player going by the reader's name, however typed", () => {
    localStorage.setItem(PLAYER_NAME_KEY, " alice ");
    expect(myPick(P1)).toBe("KC -3");
  });

  it("finds nothing with no name set", () => {
    expect(myPick(P1)).toBeUndefined();
  });

  it("finds nothing for a blank cell", () => {
    localStorage.setItem(PLAYER_NAME_KEY, "Alice");
    expect(myPick(P2)).toBeUndefined();
  });
});
