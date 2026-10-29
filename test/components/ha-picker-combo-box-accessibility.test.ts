import { describe, expect, it, vi } from "vitest";
import type { LocalizeFunc } from "../../src/common/translations/localize";
import {
  getInitialActivePickerItemIndex,
  getPickerOptionAnnouncement,
} from "../../src/components/ha-picker-combo-box-accessibility";

interface Item {
  id: string;
  primary: string;
  secondary?: string;
  disabled?: boolean;
}

const isOption = (item: Item | string): item is Item =>
  typeof item !== "string" && !item.id.startsWith("___");

const items: (Item | string)[] = [
  "Devices",
  { id: "disabled", primary: "Disabled device", disabled: true },
  { id: "lamp", primary: "Hall lamp", secondary: "Main hall" },
  { id: "switch", primary: "Hall switch" },
];

describe("picker keyboard accessibility", () => {
  it("starts at the last available option for ArrowUp and first for ArrowDown", () => {
    expect(
      getInitialActivePickerItemIndex(
        items,
        undefined,
        "",
        "previous",
        isOption
      )
    ).toBe(3);
    expect(
      getInitialActivePickerItemIndex(items, undefined, "", "next", isOption)
    ).toBe(2);
  });

  it("starts from the selected option when one is available", () => {
    expect(
      getInitialActivePickerItemIndex(items, "lamp", "", "previous", isOption)
    ).toBe(2);
  });

  it("announces the active option position and its supporting text", () => {
    const localize: LocalizeFunc = (key, values) =>
      `${key}:${String(values?.index)}/${String(values?.count)}:${String(values?.option)}`;

    expect(
      getPickerOptionAnnouncement(items, 2, undefined, isOption, localize)
    ).toBe("ui.components.combo-box.active_option:1/2:Hall lamp, Main hall");
  });

  it("announces when the active option is the selected value", () => {
    const localize = vi.fn<LocalizeFunc>((key) => key);

    expect(
      getPickerOptionAnnouncement(items, 3, "switch", isOption, localize)
    ).toBe("ui.components.combo-box.selected_option");
    expect(localize).toHaveBeenCalledWith(
      "ui.components.combo-box.selected_option",
      {
        index: 2,
        count: 2,
        option: "Hall switch",
      }
    );
  });

  it("does not announce placeholders or disabled options", () => {
    const localize = vi.fn<LocalizeFunc>((key) => key);

    expect(
      getPickerOptionAnnouncement(items, 0, undefined, isOption, localize)
    ).toBeUndefined();
    expect(
      getPickerOptionAnnouncement(items, 1, undefined, isOption, localize)
    ).toBeUndefined();
    expect(localize).not.toHaveBeenCalled();
  });
});
