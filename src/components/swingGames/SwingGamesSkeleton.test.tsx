import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SettingsContextProvider } from "../../context/SettingsContext";
import SwingGamesSkeleton from "./SwingGamesSkeleton";

describe("SwingGamesSkeleton", () => {
  it("draws real swing game cards, hidden from a screen reader", () => {
    render(
      <MemoryRouter>
        <SettingsContextProvider>
          <SwingGamesSkeleton />
        </SettingsContextProvider>
      </MemoryRouter>,
    );

    const wireframe = document.querySelector(".swing-games.--loading");
    expect(wireframe).toHaveAttribute("aria-hidden", "true");
    expect(wireframe).toHaveAttribute("inert");
    expect(wireframe?.querySelectorAll(".swing-games__group")).toHaveLength(4);
    expect(wireframe?.querySelector(".section-title")).not.toBeNull();
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  });
});
