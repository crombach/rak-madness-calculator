import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import NavMenu from "./NavMenu";

const SEASON = 2024;
const WEEK = 3;

/** Names the URL a click landed on, from the router's own history. */
function Landed() {
  return <span data-testid="landed">{useLocation().pathname}</span>;
}

function mount(disabled = false) {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/"]}>
      <NavMenu season={SEASON} week={WEEK} disabled={disabled} />
      <Routes>
        <Route path="*" element={<Landed />} />
      </Routes>
    </MemoryRouter>,
  );
  return user;
}

function trigger() {
  return screen.getByRole("button", { name: "Menu" });
}

describe("NavMenu", () => {
  it('names its trigger "Menu"', () => {
    mount();

    expect(trigger()).toBeInTheDocument();
  });

  it("opens on a click and highlights the item on ArrowDown", async () => {
    const user = mount();
    await user.click(trigger());
    const item = await screen.findByRole("menuitem", { name: "Swing Games" });

    await user.keyboard("{ArrowDown}");

    expect(item).toHaveFocus();
  });

  it("returns focus to the trigger on Escape", async () => {
    const user = mount();
    await user.click(trigger());
    await screen.findByRole("menuitem", { name: "Swing Games" });

    await user.keyboard("{Escape}");

    await waitFor(() => expect(trigger()).toHaveFocus());
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
  });

  it("goes to the swing games page and closes on a click", async () => {
    const user = mount();
    await user.click(trigger());
    await user.click(
      await screen.findByRole("menuitem", { name: "Swing Games" }),
    );

    expect(await screen.findByTestId("landed")).toHaveTextContent(
      `/${SEASON}/${WEEK}/swings`,
    );
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
  });
});
