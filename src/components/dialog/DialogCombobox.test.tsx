import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ReactNode, useState } from "react";
import DialogCombobox from "./DialogCombobox";

const ITEMS = ["Bills", "Chiefs"];

function Search({
  renderOption,
}: {
  renderOption: (item: string) => ReactNode;
}) {
  const [query, setQuery] = useState("");
  return (
    <DialogCombobox<string>
      ariaLabel="Team"
      placeholder="Search teams..."
      emptyMessage="No matching teams"
      items={ITEMS}
      filteredItems={ITEMS}
      onValueChange={() => {}}
      query={query}
      onQueryChange={setQuery}
      itemToStringLabel={(item) => item}
      itemKey={(item) => item}
      renderOption={renderOption}
    />
  );
}

describe("DialogCombobox", () => {
  it("draws an entry again when it is handed another renderOption", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Search renderOption={(item) => `${item} 1`} />,
    );
    await user.click(screen.getByRole("combobox", { name: "Team" }));
    await screen.findByRole("option", { name: "Bills 1" });

    rerender(<Search renderOption={(item) => `${item} 2`} />);

    expect(screen.getByRole("option", { name: "Bills 2" })).toBeInTheDocument();
  });
});
