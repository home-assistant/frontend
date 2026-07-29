import { describe, it, expect } from "vitest";
import { html, nothing, render } from "lit";
import "../../src/components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  HaDataTable,
} from "../../src/components/data-table/ha-data-table";

const columns: DataTableColumnContainer = {
  name: { title: "Name", main: true },
  area: { title: "Area" },
  category: { title: "Category" },
  empty_template: { title: "Empty", template: () => nothing },
  filled_template: { title: "Filled", template: () => html`filled` },
};

// The narrow row puts every non-main column on a secondary line, joined by dots.
const renderNarrowSecondary = (row: DataTableRowData) => {
  const el = document.createElement("ha-data-table") as HaDataTable;
  const container = document.createElement("div");
  render((el as any)._renderRow(columns, true, row, 0), container);
  return container.querySelector(".secondary")!.textContent!.trim();
};

describe("ha-data-table narrow secondary line", () => {
  it("does not render separators for empty columns", () => {
    expect(renderNarrowSecondary({ id: "1", name: "Test" })).toBe("filled");
  });

  it("separates only the columns that have a value", () => {
    expect(
      renderNarrowSecondary({ id: "1", name: "Test", area: "Kitchen" })
    ).toBe("Kitchen · filled");
  });
});
