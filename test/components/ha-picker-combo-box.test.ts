import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import "../../src/components/ha-picker-combo-box";
import type { HaPickerComboBox } from "../../src/components/ha-picker-combo-box";
import type { HaListBase } from "../../src/components/list/ha-list-base";

const mountPicker = async (value?: string) => {
  const picker = document.createElement(
    "ha-picker-combo-box"
  ) as HaPickerComboBox;
  // The scroll fade is unrelated to keyboard navigation in this test.
  Object.defineProperty(picker, "_resize", {
    value: { observe: vi.fn(), unobserve: vi.fn() },
  });
  picker.value = value;
  picker.getItems = () => [
    { id: "lamp", primary: "Hall lamp" },
    { id: "switch", primary: "Hall switch" },
  ];
  document.body.append(picker);
  await picker.updateComplete;

  const list = picker.shadowRoot!.querySelector(
    "ha-list-selectable"
  ) as HaListBase;
  await list.updateComplete;
  await Promise.all(list.items.map((item) => item.updateComplete));
  list.items.forEach((item) => {
    item.scrollIntoView = () => undefined;
  });
  return { picker, list };
};

const pressKey = (picker: HaPickerComboBox, key: string) => {
  picker.shadowRoot!.querySelector("ha-input-search")!.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      code: key,
      bubbles: true,
      composed: true,
      cancelable: true,
    })
  );
};

beforeAll(() => {
  // jsdom's ElementInternals lacks the validity API used by wa-input.
  const internalsProto = window.ElementInternals.prototype as any;
  internalsProto.setValidity = vi.fn();
  internalsProto.setFormValue = vi.fn();
  internalsProto.checkValidity = () => true;
  internalsProto.reportValidity = () => true;
  internalsProto.states = new Set();
  Object.defineProperty(internalsProto, "validity", {
    get: () => ({ valid: true }),
    configurable: true,
  });
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ha-picker-combo-box keyboard navigation", () => {
  it("starts on the last option when ArrowUp is pressed first", async () => {
    const { picker, list } = await mountPicker();

    pressKey(picker, "ArrowUp");

    expect(list.getActiveItemIndex()).toBe(1);
  });

  it("starts on the first option when ArrowDown is pressed first", async () => {
    const { picker, list } = await mountPicker();

    pressKey(picker, "ArrowDown");

    expect(list.getActiveItemIndex()).toBe(0);
  });

  it("clears and re-announces the same option after focus leaves and returns", async () => {
    const { picker, list } = await mountPicker();
    const search = picker.shadowRoot!.querySelector("ha-input-search")!;
    const status = picker.shadowRoot!.querySelector('[role="status"]')!;

    pressKey(picker, "ArrowDown");
    await picker.updateComplete;
    expect(status.textContent).toContain("Hall lamp");

    search.dispatchEvent(new Event("blur"));
    await picker.updateComplete;
    expect(list.getActiveItemIndex()).toBe(-1);
    expect(status.textContent?.trim()).toBe("");

    pressKey(picker, "ArrowDown");
    await picker.updateComplete;
    expect(list.getActiveItemIndex()).toBe(0);
    expect(status.textContent).toContain("Hall lamp");
  });

  it("starts from the selected first option when ArrowUp is pressed first", async () => {
    const { picker, list } = await mountPicker("lamp");

    pressKey(picker, "ArrowUp");

    expect(list.getActiveItemIndex()).toBe(0);
  });
});
