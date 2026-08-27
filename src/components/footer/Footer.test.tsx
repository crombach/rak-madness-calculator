import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Footer from "./Footer";

function renderFooter(path = "/") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Footer />
    </MemoryRouter>,
  );
}

describe("Footer", () => {
  it("links to the settings page, the standings, and the repo, in that order", () => {
    renderFooter();
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual([
      "/settings",
      "https://rakmadness.net/standings-pickem",
      "https://github.com/crombach/rak-madness-calculator",
    ]);
  });

  it("opens every link that leaves the app in a new tab, without the referrer", () => {
    renderFooter();
    const leaving = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("http"));

    expect(leaving).toHaveLength(2);
    leaving.forEach((link) => {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noreferrer");
    });
  });

  it("keeps the settings link in the app", () => {
    renderFooter();

    expect(screen.getByRole("link", { name: "Settings" })).not.toHaveAttribute(
      "target",
    );
  });

  it("marks the settings link on the settings page", () => {
    renderFooter("/settings");

    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("marks nothing on any other page", () => {
    renderFooter("/");

    expect(screen.getByRole("link", { name: "Settings" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("names each link by its text, not the decorative icon beside it", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: "Standings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "GitHub" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });
});
