import { ContextProvider } from "@lit/context";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import "../../src/components/ha-areas-floors-display-editor";
import type {
  AreasFloorsDisplayValue,
  HaAreasFloorsDisplayEditor,
} from "../../src/components/ha-areas-floors-display-editor";
import type { HaItemDisplayEditor } from "../../src/components/ha-items-display-editor";
import {
  areasContext,
  floorsContext,
  internationalizationContext,
} from "../../src/data/context";
import type {
  HomeAssistant,
  HomeAssistantInternationalization,
} from "../../src/types";

beforeAll(() => {
  // jsdom's ElementInternals lacks the validity API used by the webawesome
  // buttons that render inside the items editor.
  const internalsProto = window.ElementInternals.prototype as any;
  internalsProto.setValidity = vi.fn();
  internalsProto.setFormValue = vi.fn();
  Object.defineProperty(internalsProto, "validity", {
    get: () => ({ valid: true }),
    configurable: true,
  });
});

class MockResizeObserver {
  observe = vi.fn();

  unobserve = vi.fn();

  disconnect = vi.fn();
}

const UNASSIGNED_FLOOR = "__unassigned__";

const FLOORS = {
  floor_a: { floor_id: "floor_a", name: "A", level: 0 },
  floor_b: { floor_id: "floor_b", name: "B", level: 1 },
} as unknown as HomeAssistant["floors"];

const area = (areaId: string, floorId: string | null) => ({
  area_id: areaId,
  name: areaId,
  floor_id: floorId,
  icon: null,
});

const AREAS = Object.fromEntries(
  [
    area("a1", "floor_a"),
    area("a2", "floor_a"),
    area("a3", "floor_a"),
    area("b1", "floor_b"),
    area("b2", "floor_b"),
    area("b3", "floor_b"),
    area("u1", null),
    area("u2", null),
  ].map((entry) => [entry.area_id, entry])
) as unknown as HomeAssistant["areas"];

describe("ha-areas-floors-display-editor", () => {
  let host: HTMLDivElement | undefined;

  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
  });

  afterEach(() => {
    host?.remove();
    host = undefined;
    vi.unstubAllGlobals();
  });

  const mount = async (
    value: AreasFloorsDisplayValue
  ): Promise<HaAreasFloorsDisplayEditor> => {
    host = document.createElement("div");
    document.body.appendChild(host);
    new ContextProvider(host, {
      context: internationalizationContext,
      initialValue: {
        localize: (key: string) => key,
      } as unknown as HomeAssistantInternationalization,
    });
    new ContextProvider(host, { context: areasContext, initialValue: AREAS });
    new ContextProvider(host, { context: floorsContext, initialValue: FLOORS });
    const el = document.createElement(
      "ha-areas-floors-display-editor"
    ) as HaAreasFloorsDisplayEditor;
    el.value = value;
    host.appendChild(el);
    await el.updateComplete;
    return el;
  };

  // Drags the first visible area of a floor below the second one and returns
  // the configuration the editor emits.
  const reorderFirstTwo = async (
    el: HaAreasFloorsDisplayEditor,
    floorId: string
  ): Promise<AreasFloorsDisplayValue> => {
    const editor = Array.from(
      el.shadowRoot!.querySelectorAll("ha-items-display-editor")
    ).find(
      (child) =>
        (child as HaItemDisplayEditor & { floorId: string }).floorId === floorId
    )!;
    await editor.updateComplete;
    const emitted: AreasFloorsDisplayValue[] = [];
    el.addEventListener(
      "value-changed",
      (ev) => emitted.push((ev as CustomEvent).detail.value),
      { once: true }
    );
    editor.shadowRoot!.querySelector("ha-sortable")!.dispatchEvent(
      new CustomEvent("item-moved", {
        detail: { oldIndex: 0, newIndex: 1 },
        bubbles: true,
        composed: true,
      })
    );
    expect(emitted).toHaveLength(1);
    return emitted[0];
  };

  it.each([
    {
      name: "hidden area on another floor",
      floorId: "floor_a",
      value: {
        areas_display: { hidden: ["b1"], order: ["b3", "b2"] },
      },
      expected: {
        hidden: ["b1"],
        order: ["a2", "a1", "a3", "b3", "b2"],
      },
    },
    {
      name: "hidden areas on the reordered and another floor",
      floorId: "floor_a",
      value: { areas_display: { hidden: ["a3", "b1"] } },
      expected: { hidden: ["a3", "b1"], order: ["a2", "a1"] },
    },
    {
      name: "reordering areas without a floor",
      floorId: UNASSIGNED_FLOOR,
      value: { areas_display: { hidden: ["b1"] } },
      expected: { hidden: ["b1"], order: ["u2", "u1"] },
    },
    {
      name: "no hidden areas",
      floorId: "floor_b",
      value: {},
      expected: { order: ["b2", "b1", "b3"] },
    },
  ])(
    "keeps hidden areas unchanged when reordering: $name",
    async ({ floorId, value, expected }) => {
      const el = await mount(value);

      const first = await reorderFirstTwo(el, floorId);
      expect(first.areas_display).toEqual(expected);

      // Saving and reordering again must not grow the hidden list
      el.value = first;
      await el.updateComplete;
      const second = await reorderFirstTwo(el, floorId);
      expect(second.areas_display?.hidden).toEqual(expected.hidden);
    }
  );
});
