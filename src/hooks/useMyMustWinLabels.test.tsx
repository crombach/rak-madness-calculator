import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import type { Mock } from "vitest";
import { useScores } from "../context/AppDataContext";
import {
  PLAYER_NAME_KEY,
  SettingsContextProvider,
} from "../context/SettingsContext";
import { RakMadnessScores } from "../types/RakMadnessScores";
import { getMustWin } from "../utils/scoring/getPlayerAnalysis";
import useMyMustWinLabels from "./useMyMustWinLabels";

vi.mock("../context/AppDataContext", () => ({ useScores: vi.fn() }));
vi.mock("../utils/scoring/getPlayerAnalysis", () => ({ getMustWin: vi.fn() }));
const mockScores = useScores as Mock;
const mockGetMustWin = getMustWin as Mock;

function scoresOf(...names: Array<string>): RakMadnessScores {
  return { scores: names.map((name) => ({ name })) } as RakMadnessScores;
}

function mustWin(...labels: Array<string>) {
  return {
    games: labels.map((label) => ({ label, pick: "KC -3", team: "KC" })),
  };
}

function Settings({ children }: PropsWithChildren) {
  return <SettingsContextProvider>{children}</SettingsContextProvider>;
}

function renderLabels() {
  return renderHook(() => useMyMustWinLabels(), { wrapper: Settings });
}

describe("useMyMustWinLabels", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGetMustWin.mockReset();
    mockGetMustWin.mockImplementation((_scores, name: string) =>
      name === "Alice" ? mustWin("P12", "P13") : mustWin(),
    );
    mockScores.mockReturnValue(scoresOf("Alice", "Bob"));
  });

  it("holds the labels getMustWin names for the reader", async () => {
    localStorage.setItem(PLAYER_NAME_KEY, "Alice");
    const { result } = renderLabels();
    await waitFor(() => expect([...result.current]).toEqual(["P12", "P13"]));
  });

  it("matches however the name is typed", async () => {
    localStorage.setItem(PLAYER_NAME_KEY, " ALICE ");
    const { result } = renderLabels();
    await waitFor(() => expect(result.current.has("P12")).toBe(true));
    expect(mockGetMustWin).toHaveBeenCalledWith(expect.anything(), "Alice");
  });

  it("is empty with no name set", async () => {
    const { result } = renderLabels();
    await Promise.resolve();
    expect(result.current.size).toBe(0);
    expect(mockGetMustWin).not.toHaveBeenCalled();
  });

  it("is empty for a name no player holds", async () => {
    localStorage.setItem(PLAYER_NAME_KEY, "Dave");
    const { result } = renderLabels();
    await Promise.resolve();
    expect(result.current.size).toBe(0);
    expect(mockGetMustWin).not.toHaveBeenCalled();
  });

  it("is empty while the scores load", async () => {
    localStorage.setItem(PLAYER_NAME_KEY, "Alice");
    mockScores.mockReturnValue(undefined);
    const { result } = renderLabels();
    await Promise.resolve();
    expect(result.current.size).toBe(0);
    expect(mockGetMustWin).not.toHaveBeenCalled();
  });

  it("reads each set of scores and name once, however many callers", async () => {
    localStorage.setItem(PLAYER_NAME_KEY, "Alice");
    const { result: first } = renderLabels();
    const { result: second } = renderLabels();
    await waitFor(() => expect(first.current.size).toBe(2));
    await waitFor(() => expect(second.current.size).toBe(2));
    expect(mockGetMustWin).toHaveBeenCalledTimes(1);
    expect(second.current).toBe(first.current);
  });
});
