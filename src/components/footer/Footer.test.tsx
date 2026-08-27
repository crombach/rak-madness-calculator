import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { SettingsContextProvider } from "../../context/SettingsContext";
import Footer from "./Footer";

function mountFooter() {
  const user = userEvent.setup();
  render(
    <SettingsContextProvider>
      <Footer />
    </SettingsContextProvider>,
  );
  return user;
}

describe("Footer", () => {
  it("offers the settings, the standings, and the repo, in that order", () => {
    mountFooter();
    const labels = Array.from(document.querySelectorAll(".footer__link")).map(
      (control) => control.textContent,
    );

    expect(labels).toEqual(["Settings", "Standings", "GitHub"]);
  });

  it("opens every link that leaves the app in a new tab, without the referrer", () => {
    mountFooter();
    const leaving = screen.getAllByRole("link");

    expect(leaving).toHaveLength(2);
    leaving.forEach((link) => {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noreferrer");
    });
  });

  it("opens the settings over the page, rather than linking away to them", async () => {
    const user = mountFooter();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(
      screen.getByRole("dialog", { name: "Settings" }),
    ).toBeInTheDocument();
  });

  it("names each link by its text, not the decorative icon beside it", () => {
    mountFooter();
    expect(screen.getByRole("link", { name: "Standings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "GitHub" })).toBeInTheDocument();
  });
});
