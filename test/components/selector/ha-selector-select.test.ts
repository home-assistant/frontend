import { beforeAll, describe, expect, it, vi } from "vitest";
import type { HaSelectSelector } from "../../../src/components/ha-selector/ha-selector-select";
import type { SelectSelector } from "../../../src/data/selector";

class ChildStub extends HTMLElement {
  public value?: unknown;
  public options?: unknown;
  public disabled?: boolean;
  public required?: boolean;
  public allowCustomValue?: boolean;
  public getItems?: () => { id: string; primary: string; disabled?: boolean }[];
  public valueRenderer?: (value: string) => unknown;
  public searchKeys?: { name: string }[];
  public searchFn?: (
    search: string,
    filteredItems: { id: string; primary: string }[],
    allItems: { id: string; primary: string }[]
  ) => { id: string }[];
}

const stub = (tag: string) => {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends ChildStub {});
  }
  return {};
};

// Mock the two dropdown controls: the test is about which one is rendered.
vi.mock("../../../src/components/ha-select", () => stub("ha-select"));
vi.mock("../../../src/components/ha-generic-picker", () =>
  stub("ha-generic-picker")
);

beforeAll(async () => {
  // Handle 'setValidity is not a function' on the radio options of list mode.
  Object.defineProperty(HTMLElement.prototype, "attachInternals", {
    configurable: true,
    value() {
      return {
        setValidity: () => {
          /* empty */
        },
        setFormValue: () => {
          /* empty */
        },
        checkValidity: () => true,
        reportValidity: () => true,
        validity: {},
        validationMessage: "",
        willValidate: true,
      };
    },
  });

  await import("../../../src/components/ha-selector/ha-selector-select");
});

const makeOptions = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    value: `value_${i}`,
    label: `Label ${i}`,
  }));

const render = async (
  select: SelectSelector["select"],
  value?: string
): Promise<HaSelectSelector> => {
  const element = document.createElement(
    "ha-selector-select"
  ) as HaSelectSelector;
  element.selector = { select };
  element.value = value;
  // Sorting reads the language from the internationalization context.
  (element as unknown as { _i18n: unknown })._i18n = {
    locale: { language: "en" },
  };
  document.body.appendChild(element);
  await element.updateComplete;
  return element;
};

const child = (element: HaSelectSelector, tag: string) =>
  element.shadowRoot!.querySelector(tag) as ChildStub | null;

describe("<ha-selector-select> dropdown", () => {
  it("keeps the plain dropdown for 12 options", async () => {
    const element = await render({
      mode: "dropdown",
      options: makeOptions(12),
    });

    expect(child(element, "ha-select")).not.toBeNull();
    expect(child(element, "ha-generic-picker")).toBeNull();
  });

  it("uses the searchable picker for more than 12 options", async () => {
    const element = await render(
      { mode: "dropdown", options: makeOptions(13) },
      "value_3"
    );

    const picker = child(element, "ha-generic-picker");
    expect(child(element, "ha-select")).toBeNull();
    expect(picker).not.toBeNull();
    expect(picker!.value).toBe("value_3");
    expect(picker!.allowCustomValue).toBeFalsy();
    expect(picker!.hasAttribute("no-sort")).toBe(true);
    expect(picker!.getItems!().map((item) => item.id)).toEqual(
      makeOptions(13).map((option) => option.value)
    );
  });

  it("does not switch to the picker for the list and box modes", async () => {
    const list = await render({ mode: "list", options: makeOptions(13) });
    const box = await render({ mode: "box", options: makeOptions(13) });

    expect(child(list, "ha-generic-picker")).toBeNull();
    expect(child(box, "ha-generic-picker")).toBeNull();
  });

  it("passes disabled options to the picker as disabled", async () => {
    const options = makeOptions(13);
    const element = await render({
      mode: "dropdown",
      options: [{ ...options[0], disabled: true }, ...options.slice(1)],
    });

    const items = child(element, "ha-generic-picker")!.getItems!();
    expect(items[0].disabled).toBe(true);
    expect(items[1].disabled).toBeFalsy();
  });

  it("searches the labels only", async () => {
    const element = await render({
      mode: "dropdown",
      options: makeOptions(13),
    });

    expect(
      child(element, "ha-generic-picker")!.searchKeys!.map((key) => key.name)
    ).toEqual(["primary"]);
  });

  it("keeps the order of the options among the matches", async () => {
    const element = await render({
      mode: "dropdown",
      options: makeOptions(13),
    });
    const picker = child(element, "ha-generic-picker")!;
    const items = picker.getItems!();

    const result = picker.searchFn!(
      "label",
      [items[9], items[2], items[5]],
      items
    );

    expect(result.map((item) => item.id)).toEqual([
      "value_2",
      "value_5",
      "value_9",
    ]);
  });

  it("leaves the matches ranked by the search when sort is set", async () => {
    const element = await render({
      mode: "dropdown",
      sort: true,
      options: makeOptions(13),
    });

    expect(child(element, "ha-generic-picker")!.searchFn).toBeUndefined();
  });

  it("fires value-changed with the picked option", async () => {
    const element = await render({
      mode: "dropdown",
      options: makeOptions(13),
    });
    const listener = vi.fn();
    element.addEventListener("value-changed", listener);

    child(element, "ha-generic-picker")!.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: "value_7" } })
    );

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail.value).toBe("value_7");
  });

  it("clears the value when the picker is cleared", async () => {
    const element = await render(
      { mode: "dropdown", options: makeOptions(13) },
      "value_3"
    );
    const listener = vi.fn();
    element.addEventListener("value-changed", listener);

    child(element, "ha-generic-picker")!.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: undefined } })
    );

    expect(listener.mock.calls[0][0].detail.value).toBeUndefined();
  });
});
