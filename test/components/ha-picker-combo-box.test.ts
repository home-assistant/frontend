import { beforeAll, describe, expect, it, vi } from "vitest";
import type {
  HaPickerComboBox,
  PickerComboBoxItem,
} from "../../src/components/ha-picker-combo-box";
import {
  defaultSelectedIndex,
  findPickableIndex,
  NO_ITEMS_AVAILABLE_ID,
  PADDING_ID,
} from "../../src/components/ha-picker-combo-box";

// Lit reports isServer under Vitest, so the real controller has no observer.
vi.mock("@lit-labs/observers/resize-controller", () => ({
  ResizeController: class {
    observe = vi.fn();

    unobserve = vi.fn();
  },
}));

const item = (id: string, disabled = false): PickerComboBoxItem => ({
  id,
  primary: id,
  disabled,
});
const [a, b, c] = ["a", "b", "c"].map((id) => item(id));
const off = item("off", true);
const padding = { id: PADDING_ID, primary: "" };
const noItems = { id: NO_ITEMS_AVAILABLE_ID, primary: "" };

describe("findPickableIndex", () => {
  it.each([
    ["End skips the dialog padding row", [a, b, padding], 2, -1, 1],
    ["arrows skip a disabled row", [a, off, b], 1, 1, 2],
    ["arrows skip a section title", ["Lights", a], 0, 1, 1],
    ["nothing pickable in that direction", [a, padding], 1, 1, -1],
  ] as const)("%s", (_name, items, from, step, expected) => {
    expect(findPickableIndex([...items], from, step)).toBe(expected);
  });
});

describe("defaultSelectedIndex", () => {
  it.each([
    ["no cursor on the empty-list placeholder", [noItems], "z", undefined, -1],
    ["no cursor without a search or value", [a, b, c], "", undefined, -1],
    ["a search takes the top pickable match", ["Lights", a, b], "a", "b", 1],
    ["otherwise the current value", [a, b, c], "", "c", 2],
  ] as const)("%s", (_name, items, search, value, expected) => {
    expect(defaultSelectedIndex([...items], search, value)).toBe(expected);
  });
});

describe("keyboard", () => {
  beforeAll(() => {
    // jsdom's ElementInternals lacks the validity API used by Web Awesome.
    const internalsProto = window.ElementInternals.prototype as any;
    internalsProto.setValidity = vi.fn();
    internalsProto.setFormValue = vi.fn();
    Object.defineProperty(internalsProto, "validity", {
      get: () => ({ valid: true }),
      configurable: true,
    });
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("ArrowDown from the list advances from the highlighted row", async () => {
    // ArrowDown focuses the search field, whose blur on the list resets the
    // cursor, so the handler must read the index before moving focus.
    const el = document.createElement(
      "ha-picker-combo-box"
    ) as HaPickerComboBox;
    el.getItems = () => [a, b, c];
    el.value = "b";
    document.body.appendChild(el);
    await el.updateComplete;

    const root = el.shadowRoot!;
    // jsdom does not render the inner input, so let the host take focus.
    root.querySelector<HTMLElement>("ha-input-search")!.tabIndex = 0;
    const list = root.querySelector<HTMLElement>(".plain-list")!;
    const press = async (key: string) => {
      root.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", {
          key,
          code: key,
          bubbles: true,
          composed: true,
        })
      );
      await el.updateComplete;
    };
    const cursorRow = () => root.querySelector(".combo-box-row.selected")?.id;

    list.focus();
    await el.updateComplete;
    await press("ArrowUp");
    expect(cursorRow()).toBe("list-item-0");

    await press("ArrowDown");
    expect(cursorRow()).toBe("list-item-1");

    el.remove();
  });
});
