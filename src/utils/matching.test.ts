import matching from "./matching";

describe("matching", () => {
  const items = ["Alice", "Bob", "Bobby"];

  it("keeps items whose text contains the query", () => {
    expect(matching(items, "Bob", (item) => item)).toEqual(["Bob", "Bobby"]);
  });

  it("keeps the one item left when the query narrows to it", () => {
    expect(matching(items, "Bobby", (item) => item)).toEqual(["Bobby"]);
  });

  it("keeps everyone before anything is typed, in list order", () => {
    expect(matching(items, "", (item) => item)).toEqual(items);
  });
});
