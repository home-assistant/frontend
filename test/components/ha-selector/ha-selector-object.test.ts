import { afterEach, describe, expect, it, vi } from "vitest";
import type { HomeAssistant } from "../../../src/types";
import type { HaObjectSelector } from "../../../src/components/ha-selector/ha-selector-object";
import type { FormDialogParams } from "../../../src/dialogs/form/show-form-dialog";
import "../../../src/components/ha-selector/ha-selector-object";

vi.mock("../../../src/components/ha-input-helper-text", () => {
  customElements.define("ha-input-helper-text", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/ha-md-list", () => {
  customElements.define("ha-md-list", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/ha-md-list-item", () => {
  customElements.define("ha-md-list-item", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/ha-sortable", () => {
  customElements.define("ha-sortable", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/ha-yaml-editor", () => {
  customElements.define("ha-yaml-editor", class extends HTMLElement {});
  return {};
});

const hass = {
  localize: (key: string) => key,
  locale: "en-US",
  floors: {},
  areas: {},
  devices: {},
  states: {},
  formatEntityName: () => "",
} as unknown as HomeAssistant;

const selectorConfig = {
  object: {
    multiple: true,
    fields: {
      name: { selector: { text: {} } },
    },
  },
};

const getInternals = (selector: HaObjectSelector) =>
  selector as unknown as Record<string, unknown>;

const mountSelector = async (value: Record<string, string>[]) => {
  const selector = document.createElement(
    "ha-selector-object"
  ) as HaObjectSelector;
  selector.hass = hass;
  selector.selector = selectorConfig;
  selector.value = value;
  document.body.append(selector);
  await selector.updateComplete;
  return selector;
};

const resolveFormDialog = async (
  selector: HaObjectSelector,
  action: "_addItem" | "_editItem",
  result: Record<string, string> | null,
  item?: Record<string, string>,
  index?: number
) => {
  let params: FormDialogParams | undefined;
  const dialogShown = new Promise<void>((resolve) => {
    selector.addEventListener(
      "show-dialog",
      (event) => {
        params = event.detail.dialogParams as FormDialogParams;
        if (result === null) {
          params.cancel!();
        } else {
          params.submit!(result);
        }
        resolve();
      },
      { once: true }
    );
  });

  const event = {
    stopPropagation: vi.fn(),
    currentTarget: { item, index },
  };
  const operation = (
    getInternals(selector)[action] as (ev: typeof event) => Promise<void>
  )(event);
  await dialogShown;
  await operation;
  return params!;
};

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe("ha-selector-object form dialog flow", () => {
  it("appends an item through the real Add flow", async () => {
    const first = { name: "A" };
    const selector = await mountSelector([first]);
    const valueChanged = vi.fn();
    selector.addEventListener("value-changed", valueChanged);

    await resolveFormDialog(selector, "_addItem", { name: "B" });

    expect(valueChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { value: [first, { name: "B" }] },
      })
    );
  });

  it("replaces an item at its original index through the real Edit flow", async () => {
    const first = { name: "A" };
    const second = { name: "B" };
    const selector = await mountSelector([first, second]);
    const valueChanged = vi.fn();
    selector.addEventListener("value-changed", valueChanged);

    await resolveFormDialog(
      selector,
      "_editItem",
      { name: "B updated" },
      second,
      1
    );

    const value = valueChanged.mock.calls[0][0].detail.value;
    expect(value).toEqual([first, { name: "B updated" }]);
    expect(value).toHaveLength(2);
  });

  it("leaves the array unchanged when Add or Edit is canceled", async () => {
    const first = { name: "A" };
    const selector = await mountSelector([first]);
    const valueChanged = vi.fn();
    selector.addEventListener("value-changed", valueChanged);

    await resolveFormDialog(selector, "_addItem", null);
    await resolveFormDialog(selector, "_editItem", null, first, 0);

    expect(valueChanged).not.toHaveBeenCalled();
  });
});
