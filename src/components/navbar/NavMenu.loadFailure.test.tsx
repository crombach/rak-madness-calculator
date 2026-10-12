import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { ToastContextProvider } from "../../context/ToastContext";
import { SettingsContextProvider } from "../../context/SettingsContext";
import Toaster from "../toaster/Toaster";
import NavMenu from "./NavMenu";

vi.mock("../../context/AppDataContext", () => ({
  useScores: () => undefined,
  useIsWeekSettled: () => false,
  useKnockouts: () => undefined,
}));

vi.mock("../settings/SettingsDialog", () => {
  throw new Error("chunk gone");
});

describe("NavMenu when the settings chunk cannot load", () => {
  it("toasts the failure and keeps the app mounted", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SettingsContextProvider>
          <ToastContextProvider>
            <NavMenu season={2024} week={3} />
            <Toaster />
          </ToastContextProvider>
        </SettingsContextProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(await screen.findByRole("menuitem", { name: "Settings" }));

    expect(
      await screen.findByText(
        "Failed to open that. Reload the page to try again.",
      ),
    ).toBeInTheDocument();
  });
});
