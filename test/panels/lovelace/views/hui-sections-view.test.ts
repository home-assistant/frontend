import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactiveControllerHost } from "lit";
import type { LovelaceViewConfig } from "../../../../src/data/lovelace/config/view";
import type { HuiSection } from "../../../../src/panels/lovelace/sections/hui-section";
import type { Lovelace } from "../../../../src/panels/lovelace/types";
import type { HomeAssistant } from "../../../../src/types";
import { SectionsView } from "../../../../src/panels/lovelace/views/hui-sections-view";
import * as packing from "../../../../src/panels/lovelace/views/sections-compact-layout";
import * as measurement from "../../../../src/panels/lovelace/views/sections-compact-measurement";

// Keep unrelated child components out of this layout lifecycle test.
vi.mock("../../../../src/components/ha-icon-button", () => ({}));
vi.mock("../../../../src/components/ha-ripple", () => ({}));
vi.mock("../../../../src/components/ha-sortable", () => ({}));
vi.mock("../../../../src/components/ha-svg-icon", () => ({}));
vi.mock(
  "../../../../src/panels/lovelace/components/hui-badge-edit-mode",
  () => ({})
);
vi.mock(
  "../../../../src/panels/lovelace/components/hui-section-edit-mode",
  () => ({})
);
vi.mock(
  "../../../../src/panels/lovelace/sections/hui-section-background",
  () => ({})
);
vi.mock("../../../../src/panels/lovelace/views/hui-view-header", () => ({}));
vi.mock("../../../../src/panels/lovelace/views/hui-view-footer", () => ({}));
vi.mock("../../../../src/panels/lovelace/views/hui-view-sidebar", () => ({}));
const resize = vi.hoisted(() => ({
  columns: 2,
  host: undefined as ReactiveControllerHost | undefined,
}));
vi.mock("@lit-labs/observers/resize-controller", () => ({
  ResizeController: class {
    constructor(host: ReactiveControllerHost) {
      resize.host = host;
    }
    get value() {
      return resize.columns;
    }
  },
}));

let element: SectionsView;
let frames: Map<number, FrameRequestCallback>;
let frameId: number;
let measure: ReturnType<typeof vi.spyOn>;
let pack: ReturnType<typeof vi.spyOn>;

const update = async () => {
  element.requestUpdate();
  await element.updateComplete;
  await Promise.resolve();
};
const flushFrame = async () => {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((callback) => callback(0));
  await update();
};
const mount = async (
  config: LovelaceViewConfig = { compact_section_placement: true },
  heights = [500, 200, 250]
) => {
  element = new SectionsView();
  element.hass = { localize: (key: string) => key } as HomeAssistant;
  element.lovelace = { editMode: false } as Lovelace;
  element.sections = heights.map((height, index) => {
    const section = document.createElement("hui-section") as HuiSection;
    section.config = { type: "grid", cards: [] };
    section.dataset.height = String(height);
    section.dataset.index = String(index);
    return section;
  });
  element.setConfig(config);
  document.body.append(element);
  await update();
};
const assignments = () =>
  [...element.shadowRoot!.querySelectorAll(".compact-lane")].map((lane) =>
    [...lane.querySelectorAll("hui-section")].map((s) =>
      s.getAttribute("data-index")
    )
  );

beforeEach(() => {
  resize.columns = 2;
  frames = new Map();
  frameId = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  measure = vi
    .spyOn(measurement, "measureSectionFootprint")
    .mockImplementation((container) => {
      const margin = container.classList.contains("align-background") ? 16 : 0;
      return {
        height:
          Number(
            container.querySelector("hui-section")!.getAttribute("data-height")
          ) + margin,
        margin,
      };
    });
  pack = vi.spyOn(packing, "computeCompactLayout");
  const original = getComputedStyle;
  vi.spyOn(window, "getComputedStyle").mockImplementation((target) => {
    if (target.classList.contains("content")) {
      return { rowGap: "24px" } as CSSStyleDeclaration;
    }
    return original(target);
  });
});
afterEach(() => {
  element?.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Sections compact lifecycle", () => {
  it("initializes once, retains section instances, and never measures after content updates", async () => {
    await mount();
    const original = [...element.sections];
    await flushFrame();
    expect(assignments()).toEqual([["0"], ["1", "2"]]);
    const lane = original[2].parentElement;
    original[1].dataset.height = "800";
    element.hass = { ...element.hass };
    await update();
    original[1].dataset.height = "50";
    await update();
    expect(original[2].parentElement).toBe(lane);
    expect(element.sections).toEqual(original);
    expect(measure).toHaveBeenCalledTimes(3);
    expect(pack).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
  });
  it("ignores a resize retaining the same content count and rebuilds once on a breakpoint", async () => {
    resize.columns = 4;
    await mount({}, [500, 100, 100, 100, 100]);
    element.setConfig({ compact_section_placement: true });
    await update();
    await flushFrame();
    const before = assignments();
    resize.host!.requestUpdate(); // Different pixel width, same effective integer.
    await update();
    expect(assignments()).toEqual(before);
    expect(pack).toHaveBeenCalledTimes(1);
    resize.columns = 3;
    await update();
    expect(element.shadowRoot!.querySelector(".compact-row")).toBeNull();
    await flushFrame();
    expect(pack).toHaveBeenCalledTimes(2);
    expect(pack.mock.calls[1][1]).toBe(3);
  });
  it("falls back for mobile and rebuilds when multiple columns return", async () => {
    await mount();
    await flushFrame();
    resize.columns = 1;
    await update();
    expect(frames.size).toBe(0);
    expect(element.shadowRoot!.querySelector(".compact-row")).toBeNull();
    resize.columns = 2;
    await update();
    await flushFrame();
    expect(pack).toHaveBeenCalledTimes(2);
  });
  it.each([{}, { dense_section_placement: true }])(
    "preserves the native renderer when disabled: %j",
    async (config) => {
      await mount(config);
      expect(
        element.shadowRoot!.querySelectorAll(".content > .section")
      ).toHaveLength(3);
      expect(
        element
          .shadowRoot!.querySelector(".content")!
          .classList.contains("dense")
      ).toBe(Boolean(config.dense_section_placement));
      expect(frames.size).toBe(0);
      expect(pack).not.toHaveBeenCalled();
    }
  );
  it("gives compact precedence over dense without changing configuration", async () => {
    const config = {
      compact_section_placement: true,
      dense_section_placement: true,
    };
    await mount(config);
    await flushFrame();
    expect(assignments()).toEqual([["0"], ["1", "2"]]);
    expect(element.shadowRoot!.querySelector(".content.dense")).toBeNull();
    expect(config.dense_section_placement).toBe(true);
  });
  it("uses canonical edit indices and native sorting, then initializes on exit", async () => {
    await mount();
    await flushFrame();
    element.lovelace = { ...element.lovelace!, editMode: true };
    await update();
    expect(element.shadowRoot!.querySelector(".compact-row")).toBeNull();
    const editors = [
      ...element.shadowRoot!.querySelectorAll("hui-section-edit-mode"),
    ];
    expect(editors.map((editor) => editor.index)).toEqual([0, 1, 2]);
    expect(element.shadowRoot!.querySelector("ha-sortable")!.disabled).toBe(
      false
    );
    expect(frames.size).toBe(0);
    element.lovelace = { ...element.lovelace!, editMode: false };
    await update();
    await flushFrame();
    expect(pack).toHaveBeenCalledTimes(2);
  });
  it("falls back for row spans including hidden sections", async () => {
    await mount({
      compact_section_placement: true,
      dense_section_placement: true,
    });
    element.sections[0].config.row_span = 2;
    element.sections[0].hidden = true;
    await update();
    expect(frames.size).toBe(0);
    expect(element.shadowRoot!.querySelector(".content.dense")).not.toBeNull();
    expect(pack).not.toHaveBeenCalled();
  });
  it("preserves the inherited card-grid span for wide stacked sections", async () => {
    resize.columns = 4;
    await mount({ compact_section_placement: true }, [500, 100, 100]);
    for (const section of element.sections) section.config.column_span = 2;
    element.dispatchEvent(new CustomEvent("section-visibility-changed"));
    await update();
    await flushFrame();
    expect(assignments()).toEqual([["0"], ["1", "2"]]);
    // hui-grid-section derives its inner card column count from this inherited
    // property. Losing it on reparenting changes card widths and section heights.
    for (const section of element.sections) {
      expect(
        section.parentElement!.parentElement!.style.getPropertyValue(
          "--column-span"
        )
      ).toBe("2");
    }
  });
  it("uses content columns after reserving the sidebar column", async () => {
    resize.columns = 3;
    await mount({ compact_section_placement: true, sidebar: { sections: [] } });
    await flushFrame();
    expect(pack.mock.calls[0][1]).toBe(2);
    expect(assignments()).toEqual([["0"], ["1", "2"]]);
  });
  it("cancels stale measurements on column changes, disconnect, and reconnect", async () => {
    resize.columns = 4;
    await mount({ compact_section_placement: true }, [500, 100, 100, 100]);
    const stale = [...frames.values()][0];
    resize.columns = 3;
    await update();
    stale(0);
    expect(pack).not.toHaveBeenCalled();
    const disconnected = [...frames.values()][0];
    element.remove();
    disconnected(0);
    expect(pack).not.toHaveBeenCalled();
    document.body.append(element);
    await update();
    await flushFrame();
    expect(pack).toHaveBeenCalledTimes(1);
    expect(pack.mock.calls[0][1]).toBe(3);
  });
  it("reinitializes for configuration structure replacement", async () => {
    await mount();
    await flushFrame();
    element.sections = [
      element.sections[2],
      element.sections[0],
      element.sections[1],
    ];
    await update();
    await flushFrame();
    expect(pack).toHaveBeenCalledTimes(2);
    expect(assignments()).toEqual([["2", "1"], ["0"]]);
  });
  it("keeps initially hidden sections mounted and visibility does not repack at the same column count", async () => {
    await mount({ compact_section_placement: true }, [500, 100, 200, 250]);
    element.sections[1].hidden = true;
    element.dispatchEvent(new CustomEvent("section-visibility-changed"));
    await update();
    await flushFrame();
    expect(assignments()).toEqual([["0"], ["2", "3"], ["1"]]);
    const before = assignments();
    element.sections[1].hidden = false;
    element.dispatchEvent(new CustomEvent("section-visibility-changed"));
    await update();
    expect(assignments()).toEqual(before);
    expect(pack).toHaveBeenCalledTimes(1);
    expect(element.sections[1].isConnected).toBe(true);
  });
  it("includes measured background margins at the fitting boundary", async () => {
    await mount({ compact_section_placement: true }, [500, 200, 276]);
    element.sections[0].config.background = { color: "red" };
    await update();
    await flushFrame();
    expect(assignments()).toEqual([["0"], ["1"], ["2"]]);
    expect(pack.mock.results[0].value[0].lanes[1].initialUsedHeight).toBe(216);
  });
});
