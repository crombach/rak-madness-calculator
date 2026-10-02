import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SettingsContextProvider } from "../../context/SettingsContext";
import KnockoutsSkeleton from "./KnockoutsSkeleton";

describe("KnockoutsSkeleton", () => {
  it("draws real knockout game cards, hidden from a screen reader", () => {
    render(
      <MemoryRouter>
        <SettingsContextProvider>
          <KnockoutsSkeleton />
        </SettingsContextProvider>
      </MemoryRouter>,
    );

    const wireframe = document.querySelector(".knockouts.--loading");
    expect(wireframe).toHaveAttribute("aria-hidden", "true");
    expect(wireframe).toHaveAttribute("inert");
    expect(wireframe?.querySelectorAll(".knockouts__group")).toHaveLength(8);
    expect(wireframe?.querySelector(".section-title")).not.toBeNull();
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  });
});
