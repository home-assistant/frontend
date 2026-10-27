import { ContextProvider } from "@lit/context";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import "../../src/components/ha-picker-combo-box";
import type {
  HaPickerComboBox,
  PickerComboBoxItem,
} from "../../src/components/ha-picker-combo-box";
import type { HaInputSearch } from "../../src/components/input/ha-input-search";
import { internationalizationContext } from "../../src/data/context";
import type { HomeAssistantInternationalization } from "../../src/types";
import { mockLocalize } from "../fixtures/hass";

const ITEMS: PickerComboBoxItem[] = [
  { id: "kitchen_light", primary: "Kitchen light" },
  { id: "kitchen_fan", primary: "Kitchen fan" },
  { id: "bedroom_light", primary: "Bedroom light" },
];

// Like the quick bar: with sections, getItems filters and returns the section
// titles as strings, which are not results.
const SECTIONED_PROPERTIES: Partial<HaPickerComboBox> = {
  sections: [{ id: "lights", label: "Lights" }],
  getItems: (searchString?: string) => {
    const matches = ITEMS.filter((item) =>
      item.primary.toLowerCase().includes(searchString ?? "")
    );
    return ["Lights", ...matches] as unknown as PickerComboBoxItem[];
  },
};

// Like the "Add new" item of the area and label pickers.
const getAdditionalItems = (searchString?: string): PickerComboBoxItem[] => [
  { id: `___ADD_NEW___${searchString ?? ""}`, primary: "Add new item" },
];

// Under Node, Lit's `isServer` is true, so the ResizeController behind the
// list's scroll fades never creates its observer and throws on use.
vi.mock("@lit-labs/observers/resize-controller", () => ({
  ResizeController: class {
    observe = vi.fn();

    unobserve = vi.fn();
  },
}));

beforeAll(() => {
  // jsdom's ElementInternals lacks the validity API used by Web Awesome.
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
  // jsdom does not scroll, but searching scrolls the list and its top match.
  Element.prototype.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

let host: HTMLDivElement | undefined;

const mountComboBox = async (properties: Partial<HaPickerComboBox> = {}) => {
  host = document.createElement("div");
  document.body.append(host);
  new ContextProvider(host, {
    context: internationalizationContext,
    initialValue: {
      localize: mockLocalize,
    } as HomeAssistantInternationalization,
  });
  const comboBox = document.createElement("ha-picker-combo-box");
  comboBox.getItems = () => ITEMS;
  Object.assign(comboBox, properties);
  host.append(comboBox);
  await comboBox.updateComplete;
  return comboBox;
};

const search = async (comboBox: HaPickerComboBox, text: string) => {
  const field =
    comboBox.shadowRoot!.querySelector<HaInputSearch>("ha-input-search")!;
  field.value = text;
  field.dispatchEvent(new Event("input"));
  await comboBox.updateComplete;
};

// The search field keeps DOM focus, so the list cannot announce anything
// itself. This status message is what a screen reader reads out instead.
const statusText = (comboBox: HaPickerComboBox) =>
  comboBox.shadowRoot!.querySelector('[role="status"]')?.textContent?.trim();

afterEach(() => {
  host?.remove();
  host = undefined;
});

describe("ha-picker-combo-box", () => {
  it("announces how many items match the search", async () => {
    const comboBox = await mountComboBox();
    expect(statusText(comboBox)).toBe("");

    await search(comboBox, "kitchen");
    expect(statusText(comboBox)).toBe(
      'ui.components.combo-box.result_count: {"count":2,"term":"‘kitchen’"}'
    );

    await search(comboBox, "bedroom");
    expect(statusText(comboBox)).toBe(
      'ui.components.combo-box.result_count: {"count":1,"term":"‘bedroom’"}'
    );
  });

  it("announces when nothing matches the search", async () => {
    const comboBox = await mountComboBox();

    await search(comboBox, "garage");
    expect(statusText(comboBox)).toBe(
      'ui.components.combo-box.no_results: {"term":"‘garage’"}'
    );
  });

  it("announces a not found label that takes the search", async () => {
    const comboBox = await mountComboBox({
      notFoundLabel: (searchString: string) =>
        `No areas found for ‘${searchString}’`,
    });

    await search(comboBox, "garage");
    expect(statusText(comboBox)).toBe("No areas found for ‘garage’");
  });

  // A live region is only read out when its text changes.
  it("announces a new search with as many results", async () => {
    const comboBox = await mountComboBox();

    await search(comboBox, "bedroom");
    const bedroomStatus = statusText(comboBox);
    await search(comboBox, "fan");
    expect(statusText(comboBox)).not.toBe(bedroomStatus);
  });

  it("announces a new search that finds nothing either", async () => {
    const comboBox = await mountComboBox({ notFoundLabel: "Nothing found!" });

    await search(comboBox, "garage");
    const garageStatus = statusText(comboBox);
    await search(comboBox, "porch");
    expect(statusText(comboBox)).not.toBe(garageStatus);
  });

  it("goes quiet again when the search is cleared", async () => {
    const comboBox = await mountComboBox();

    await search(comboBox, "kitchen");
    await search(comboBox, "");
    expect(statusText(comboBox)).toBe("");
  });

  it("does not count section titles", async () => {
    const comboBox = await mountComboBox(SECTIONED_PROPERTIES);

    await search(comboBox, "light");
    expect(statusText(comboBox)).toBe(
      'ui.components.combo-box.result_count: {"count":2,"term":"‘light’"}'
    );
  });

  // The custom value and "Add new" rows are offered for any search, so they
  // are not results.
  it.each([
    ["without sections", {}],
    ["with sections", SECTIONED_PROPERTIES],
  ])(
    "does not count the rows it adds itself %s",
    async (_name, properties: Partial<HaPickerComboBox>) => {
      const comboBox = await mountComboBox({
        ...properties,
        allowCustomValue: true,
        getAdditionalItems,
      });

      await search(comboBox, "garage");
      expect(statusText(comboBox)).toBe(
        'ui.components.combo-box.no_results: {"term":"‘garage’"}'
      );

      await search(comboBox, "light");
      expect(statusText(comboBox)).toBe(
        'ui.components.combo-box.result_count: {"count":2,"term":"‘light’"}'
      );
    }
  );
});
