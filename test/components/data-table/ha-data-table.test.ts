import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../../src/components/data-table/ha-data-table";
import type {
  DataTableRowData,
  HaDataTable,
} from "../../../src/components/data-table/ha-data-table";

vi.mock("../../../src/components/data-table/sort-filter", () => ({
  filterData: async (data: DataTableRowData[], _columns, filter: string) =>
    data.filter((row) => row.name.includes(filter)),
  sortData: async (data: DataTableRowData[]) => data,
}));

vi.mock("../../../src/resources/virtualizer", () => ({
  loadVirtualizer: async () => undefined,
}));

// Form-associated elements and animations need features jsdom lacks
vi.mock("../../../src/components/input/ha-input-search", () => ({}));
vi.mock("../../../src/components/animation/ha-fade-in", () => ({}));

class MockResizeObserver {
  observe = vi.fn();

  unobserve = vi.fn();

  disconnect = vi.fn();
}

const DATA = [
  { id: "1", name: "apple" },
  { id: "2", name: "banana" },
  { id: "3", name: "cherry" },
];

describe("ha-data-table search", () => {
  let table: HaDataTable | undefined;

  // Every list of rows the table has rendered, in order
  let shownRows: string[][];

  const lastShown = () => shownRows[shownRows.length - 1];

  const mountTable = (filter: string) => {
    table = document.createElement("ha-data-table") as HaDataTable;
    table.columns = { name: { title: "Name", filterable: true } };
    table.data = DATA;
    table.filter = filter;
    shownRows = [];
    table.addController({
      hostUpdated: () => {
        const rows = table!["_filteredData"];
        if (rows) {
          shownRows.push(rows.map((row) => row.name));
        }
      },
    });
    document.body.appendChild(table);
    return table;
  };

  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
  });

  afterEach(() => {
    table?.remove();
    table = undefined;
    vi.unstubAllGlobals();
  });

  it("never shows unfiltered rows when created with a search", async () => {
    mountTable("ban");
    await vi.waitFor(() => expect(lastShown()).toEqual(["banana"]));
    expect(shownRows).not.toContainEqual(["apple", "banana", "cherry"]);
  });

  it("still filters when the search changes later", async () => {
    const el = mountTable("");
    await vi.waitFor(() => expect(lastShown()).toHaveLength(3));
    el.filter = "che";
    await vi.waitFor(() => expect(lastShown()).toEqual(["cherry"]));
  });
});
