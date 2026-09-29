import matching from "./matching";

describe("matching", () => {
  const items = ["Alice", "Bob", "Bobby"];

  it.each([
    ["Bob", ["Bob", "Bobby"]],
    ["Bobby", ["Bobby"]],
    ["", items],
  ])("matches query %p", (query, expected) => {
    expect(matching(items, query, (item) => item)).toEqual(expected);
  });
});
