import { render, screen } from "@testing-library/react";
import Footer from "./Footer";

function mountFooter() {
  render(<Footer />);
}

describe("Footer", () => {
  it("offers the standings and the repo links with correct hrefs and attributes", () => {
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
    expect(screen.getByRole("link", { name: "Standings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "GitHub" })).toBeInTheDocument();
  });
});
