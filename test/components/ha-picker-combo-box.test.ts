import { describe, expect, it } from "vitest";
import type { PickerComboBoxItem } from "../../src/components/ha-picker-combo-box";
import {
  defaultSelectedIndex,
  findPickableIndex,
  isPickableItem,
  NO_ITEMS_AVAILABLE_ID,
  PADDING_ID,
} from "../../src/components/ha-picker-combo-box";

// These guard the rule the highlight depends on: the keyboard cursor may only
// land on a row Enter can actually pick. Rows that look like items but are not
// (the section titles, the dialog padding row, the "no items" placeholder) have
// each been picked by Enter at some point, firing value-changed with a sentinel
// id.
const item = (id: string, disabled = false): PickerComboBoxItem => ({
  id,
  primary: id,
  disabled,
});

describe("isPickableItem", () => {
  it("accepts a plain item", () => {
    expect(isPickableItem(item("light.desk"))).toBe(true);
  });

  it("rejects a section title, which is a plain string", () => {
    expect(isPickableItem("Lights")).toBe(false);
  });

  it("rejects a disabled item", () => {
    expect(isPickableItem(item("light.shed", true))).toBe(false);
  });

  it("rejects the dialog padding row", () => {
    expect(isPickableItem({ id: PADDING_ID, primary: "" })).toBe(false);
  });

  it("rejects the empty-list placeholder", () => {
    expect(isPickableItem({ id: NO_ITEMS_AVAILABLE_ID, primary: "" })).toBe(
      false
    );
  });

  it("rejects a missing item", () => {
    expect(isPickableItem(undefined)).toBe(false);
  });
});

describe("findPickableIndex", () => {
  const items = [
    "Lights", // 0
    item("light.a"), // 1
    item("light.b", true), // 2
    "Switches", // 3
    item("switch.c"), // 4
    { id: PADDING_ID, primary: "" }, // 5
  ];

  it("skips a leading section title", () => {
    expect(findPickableIndex(items, 0, 1)).toBe(1);
  });

  it("skips a disabled row and the section title after it", () => {
    expect(findPickableIndex(items, 2, 1)).toBe(4);
  });

  it("skips the padding row when walking back from the end", () => {
    expect(findPickableIndex(items, items.length - 1, -1)).toBe(4);
  });

  it("walks back past a section title and a disabled row", () => {
    expect(findPickableIndex(items, 3, -1)).toBe(1);
  });

  it("returns -1 when nothing pickable is left in that direction", () => {
    expect(findPickableIndex(items, 5, 1)).toBe(-1);
    expect(findPickableIndex(items, 0, -1)).toBe(-1);
  });

  it("returns -1 for an empty list", () => {
    expect(findPickableIndex([], 0, 1)).toBe(-1);
  });
});

describe("defaultSelectedIndex", () => {
  const items = [item("light.a"), item("light.b"), item("light.c")];

  it("has no cursor on an untouched list with no value", () => {
    expect(defaultSelectedIndex(items, "")).toBe(-1);
  });

  it("takes the top match once the user has typed", () => {
    expect(defaultSelectedIndex(items, "a")).toBe(0);
  });

  it("skips an unpickable top row when the user has typed", () => {
    expect(defaultSelectedIndex(["Lights", ...items], "a")).toBe(1);
  });

  it("starts on the current value when nothing has been typed", () => {
    expect(defaultSelectedIndex(items, "", "light.c")).toBe(2);
  });

  it("prefers the search over the current value", () => {
    expect(defaultSelectedIndex(items, "a", "light.c")).toBe(0);
  });

  it("has no cursor when the current value is not in the list", () => {
    expect(defaultSelectedIndex(items, "", "light.gone")).toBe(-1);
  });

  it("has no cursor when a search matches nothing pickable", () => {
    expect(
      defaultSelectedIndex([{ id: NO_ITEMS_AVAILABLE_ID, primary: "" }], "zzz")
    ).toBe(-1);
  });
});
