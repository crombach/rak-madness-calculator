import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import PageLayout from "./PageLayout";

const SCROLLED = 120;

function layout(scrollKey: string) {
  return (
    <MemoryRouter>
      <PageLayout title="Page" navbarLeft={null} scrollKey={scrollKey}>
        content
      </PageLayout>
    </MemoryRouter>
  );
}

function content(): HTMLElement {
  return document.querySelector(".page__content") as HTMLElement;
}

describe("PageLayout scrollKey", () => {
  it("returns the content to the top when the key changes", () => {
    const { rerender } = render(layout("scores"));
    content().scrollTop = SCROLLED;

    rerender(layout("games"));

    expect(content().scrollTop).toBe(0);
  });

  it("keeps the offset when the key stays the same", () => {
    const { rerender } = render(layout("scores"));
    content().scrollTop = SCROLLED;

    rerender(layout("scores"));

    expect(content().scrollTop).toBe(SCROLLED);
  });
});
