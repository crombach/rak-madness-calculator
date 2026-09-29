import { render, screen } from "@testing-library/react";
import Footer from "./Footer";

function mountFooter() {
  render(<Footer />);
}

describe("Footer", () => {
  it("offers the standings and the repo, in that order", () => {
    mountFooter();
    const labels = Array.from(document.querySelectorAll(".footer__link")).map(
      (control) => control.textContent,
    );

    expect(labels).toEqual(["Standings", "GitHub"]);
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

  it("names each link by its text, not the decorative icon beside it", () => {
    mountFooter();
    expect(screen.getByRole("link", { name: "Standings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "GitHub" })).toBeInTheDocument();
  });
});
