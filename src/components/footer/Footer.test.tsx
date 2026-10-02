import { render, screen } from "@testing-library/react";
import Footer from "./Footer";

function mountFooter() {
  render(<Footer />);
}

describe("Footer", () => {
  it("offers the standings and the repo links with correct hrefs and attributes", () => {
    mountFooter();
    const leaving = [
      screen.getByRole("link", { name: "Standings" }),
      screen.getByRole("link", { name: "GitHub" }),
    ];

    expect(leaving.map((link) => link.getAttribute("href"))).toEqual([
      "https://rakmadness.net/standings-pickem",
      "https://github.com/crombach/rak-madness-calculator",
    ]);
    leaving.forEach((link) => {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noreferrer");
    });
  });

  it("offers a suggestions link that opens a mail to the app's inbox", () => {
    mountFooter();
    const suggestions = screen.getByRole("link", { name: "Feedback" });

    expect(suggestions).toHaveAttribute("href", "mailto:rakulator@gmail.com");
    expect(suggestions).not.toHaveAttribute("target");
  });
});
