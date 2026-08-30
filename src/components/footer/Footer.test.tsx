import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { SettingsContextProvider } from "../../context/SettingsContext";
import Footer, { SETTINGS_SEEN_KEY } from "./Footer";

/**
 * The settings control itself. Base UI hides the page behind an open dialog, so a
 * role query stops finding it exactly when this file wants to look at it.
 */
function settingsControl() {
  return document.querySelector(".footer__link");
}

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
  beforeEach(() => localStorage.clear());

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

    expect(leaving.map((link) => link.getAttribute("href"))).toEqual([
      "https://rakmadness.net/standings-pickem",
      "https://github.com/crombach/rak-madness-calculator",
    ]);
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

  it("pulses the settings at a reader who has never opened them", () => {
    mountFooter();

    expect(settingsControl()).toHaveClass("footer__link--unseen");
  });

  it("stops pulsing as the settings open, rather than once they close", async () => {
    const user = mountFooter();

    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(
      screen.getByRole("dialog", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(settingsControl()).not.toHaveClass("footer__link--unseen");
    expect(
      Date.parse(localStorage.getItem(SETTINGS_SEEN_KEY) ?? ""),
    ).not.toBeNaN();
  });

  it("leaves the settings quiet for a reader who has opened them since", () => {
    localStorage.setItem(SETTINGS_SEEN_KEY, new Date().toISOString());
    mountFooter();

    expect(settingsControl()).not.toHaveClass("footer__link--unseen");
  });

  it("pulses again at a reader whose last look predates the settings' own", () => {
    localStorage.setItem(SETTINGS_SEEN_KEY, "2020-01-01T00:00:00.000Z");
    mountFooter();

    expect(settingsControl()).toHaveClass("footer__link--unseen");
  });

  it("treats a stamp it cannot read as never having looked", () => {
    localStorage.setItem(SETTINGS_SEEN_KEY, "true");
    mountFooter();

    expect(settingsControl()).toHaveClass("footer__link--unseen");
  });

  it("names each link by its text, not the decorative icon beside it", () => {
    mountFooter();
    expect(screen.getByRole("link", { name: "Standings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "GitHub" })).toBeInTheDocument();
  });
});
