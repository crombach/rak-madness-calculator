import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { ToastContextProvider } from "../../context/ToastContext";
import { SettingsContextProvider } from "../../context/SettingsContext";
import { DIALOG_LOAD_ERROR } from "../dialog/lazyDialog";
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
  it("toasts the failure on every tap and keeps the menu mounted", async () => {
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

    const openSettings = async () => {
      await user.click(screen.getByRole("button", { name: "Menu" }));
      await user.click(
        await screen.findByRole("menuitem", { name: "Settings" }),
      );
    };

    await openSettings();
    expect(await screen.findByText(DIALOG_LOAD_ERROR)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() =>
      expect(screen.queryByText(DIALOG_LOAD_ERROR)).not.toBeInTheDocument(),
    );

    await openSettings();
    expect(await screen.findByText(DIALOG_LOAD_ERROR)).toBeInTheDocument();
  });
});
