import { describe, expect, it, vi } from "vitest";
import {
  HaPickerComboBox,
  NO_ITEMS_AVAILABLE_ID,
} from "../../src/components/ha-picker-combo-box";

describe("ha-picker-combo-box", () => {
  const setVirtualizerItems = (
    combo: HaPickerComboBox,
    items: { id: string; primary: string }[]
  ) => {
    Object.defineProperty(combo, "virtualizerElement", {
      configurable: true,
      value: { items },
    });
  };

  it("prefers the real selectable item over the no-items placeholder", () => {
    const combo = new HaPickerComboBox();
    const fireSelectedEvents = vi.fn();
    const stopPropagation = vi.fn();
    const preventDefault = vi.fn();

    setVirtualizerItems(combo, [
      { id: NO_ITEMS_AVAILABLE_ID, primary: "" },
      { id: "___ADD_NEW___buglabel", primary: "Add new label 'buglabel'" },
    ]);
    (combo as any)._fireSelectedEvents = fireSelectedEvents;

    (combo as any)._pickItem(
      {
        stopPropagation,
        preventDefault,
      },
      false
    );

    expect(fireSelectedEvents).toHaveBeenCalledWith(
      "___ADD_NEW___buglabel",
      1,
      false
    );
  });

  it("does not select the no-items placeholder by itself", () => {
    const combo = new HaPickerComboBox();
    const fireSelectedEvents = vi.fn();
    const stopPropagation = vi.fn();
    const preventDefault = vi.fn();

    setVirtualizerItems(combo, [{ id: NO_ITEMS_AVAILABLE_ID, primary: "" }]);
    (combo as any)._fireSelectedEvents = fireSelectedEvents;

    (combo as any)._pickItem(
      {
        stopPropagation,
        preventDefault,
      },
      false
    );

    expect(fireSelectedEvents).not.toHaveBeenCalled();
  });
});
