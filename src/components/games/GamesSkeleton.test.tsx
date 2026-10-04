import { render } from "@testing-library/react";
import {
  PLAYER_NAME_KEY,
  SettingsContextProvider,
} from "../../context/SettingsContext";
import GamesSkeleton from "./GamesSkeleton";

const mount = () =>
  render(
    <SettingsContextProvider>
      <GamesSkeleton />
    </SettingsContextProvider>,
  );
const myPicks = (container: HTMLElement) =>
  container.querySelectorAll(".game-status__my-pick");

describe("GamesSkeleton", () => {
  afterEach(() => localStorage.clear());

  it("holds a line for the reader's pick where a name is set", () => {
    localStorage.setItem(PLAYER_NAME_KEY, "alice");
    const { container } = mount();
    expect(myPicks(container).length).toBeGreaterThan(0);
  });

  it("holds no line for a pick with no name set", () => {
    const { container } = mount();
    expect(myPicks(container)).toHaveLength(0);
  });
});
