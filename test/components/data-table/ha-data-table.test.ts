import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../../src/resources/polyfills/resize-observer";
import "../../../src/components/data-table/ha-data-table";
import type { HaDataTable } from "../../../src/components/data-table/ha-data-table";
import type { HASSDomEvent } from "../../../src/common/dom/fire_event";

let table: HaDataTable;
let selected: string[];

const settle = async () => {
  await table.updateComplete;
  await vi.runOnlyPendingTimersAsync();
  await table.updateComplete;
};

beforeEach(() => {
  vi.useFakeTimers();
  table = document.createElement("ha-data-table");
  selected = [];
  table.addEventListener("selection-changed", (event) => {
    selected = [
      ...(event as HASSDomEvent<HASSDomEvents["selection-changed"]>).detail
        .value,
    ];
  });
  document.body.append(table);
});

afterEach(() => {
  table.remove();
  vi.useRealTimers();
});

describe("ha-data-table selection", () => {
  it("unions currently eligible selectable rows with hidden selections without duplicates", async () => {
    table.selectionScope = new Set(["a", "b", "disabled"]);
    table.data = [{ id: "a" }];
    await settle();
    table.selectAll();
    expect(selected).toEqual(["a"]);

    table.data = [
      { id: "b" },
      { id: "disabled", selectable: false },
      { id: "outside" },
    ];
    await settle();
    expect(selected).toEqual(["a"]);
    table.selectAll();
    table.selectAll();
    expect(selected).toEqual(["a", "b"]);
  });

  it("prunes hidden IDs only when their scope eligibility ends and clears selection globally", async () => {
    table.selectionScope = new Set(["a", "b"]);
    table.data = [{ id: "a" }, { id: "b" }];
    await settle();
    table.selectAll();
    expect(selected).toEqual(["a", "b"]);

    table.data = [];
    await settle();
    expect(selected).toEqual(["a", "b"]);
    table.selectionScope = new Set(["b"]);
    await settle();
    expect(selected).toEqual(["b"]);
    table.clearSelection();
    expect(selected).toEqual([]);
    table.selectAll();
    expect(selected).toEqual([]);
  });

  it("replaces selection and prunes rows removed from data when no scope is supplied", async () => {
    table.data = [{ id: "a" }, { id: "b" }];
    await settle();
    table.selectAll();
    expect(selected).toEqual(["a", "b"]);
    table.selectAll((row) => row.id === "a");
    expect(selected).toEqual(["a"]);

    table.data = [{ id: "b" }];
    await settle();
    expect(selected).toEqual([]);
    table.selectAll();
    expect(selected).toEqual(["b"]);
  });
});
