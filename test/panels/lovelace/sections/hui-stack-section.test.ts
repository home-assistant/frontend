import { afterEach, describe, expect, it, vi } from "vitest";
import type { LovelaceViewConfig } from "../../../../src/data/lovelace/config/view";
import type { LovelaceConfig } from "../../../../src/data/lovelace/config/types";
import type { LovelaceStackSectionConfig } from "../../../../src/data/lovelace/config/section";
import type { LovelaceSectionPath } from "../../../../src/panels/lovelace/editor/lovelace-path";
import { StackSection } from "../../../../src/panels/lovelace/sections/hui-stack-section";
import type { HuiSection } from "../../../../src/panels/lovelace/sections/hui-section";
import type { Lovelace } from "../../../../src/panels/lovelace/types";
import type { HomeAssistant } from "../../../../src/types";
import { fireEvent } from "../../../../src/common/dom/fire_event";

// Exercise the stack's lifecycle and editing events independently of card rendering.
vi.mock("../../../../src/components/ha-ripple", () => ({}));
vi.mock("../../../../src/components/ha-svg-icon", () => ({}));
vi.mock("../../../../src/components/ha-sortable", () => ({}));
vi.mock(
  "../../../../src/panels/lovelace/components/hui-section-edit-mode",
  () => ({})
);
vi.mock(
  "../../../../src/panels/lovelace/sections/hui-section-background",
  () => ({})
);

customElements.define(
  "hui-section",
  class extends HTMLElement {
    sectionPath?: LovelaceSectionPath;
    get path() {
      return this.sectionPath;
    }
  }
);

const config: LovelaceStackSectionConfig = {
  type: "stack",
  column_span: 2,
  sections: [
    { type: "grid", column_span: 3, cards: [] },
    { type: "grid", cards: [] },
  ],
};
let stack: StackSection;
const mount = async (editMode = false) => {
  stack = new StackSection();
  stack.hass = { localize: (key: string) => key } as HomeAssistant;
  stack.viewIndex = 0;
  stack.index = 0;
  stack.preview = editMode;
  stack.lovelace = {
    config: { views: [{ type: "sections", sections: [config] }] },
    editMode,
    saveConfig: vi.fn(),
  } as unknown as Lovelace;
  stack.setConfig(config);
  document.body.append(stack);
  await stack.updateComplete;
  return [...stack.shadowRoot!.querySelectorAll<HuiSection>("hui-section")];
};
afterEach(() => stack?.remove());

describe("section stack lifecycle", () => {
  it("forwards state and editor paths while preserving child config", async () => {
    const children = await mount();
    expect(children.map((child) => child.sectionPath)).toEqual([
      [0, 0, 0],
      [0, 0, 1],
    ]);
    expect(children[0].config).toBe(config.sections[0]);
    stack.hass = { ...stack.hass };
    await stack.updateComplete;
    expect(children[0].hass).toBe(stack.hass);
    expect(stack.shadowRoot!.querySelector("hui-section")).toBe(children[0]);
    stack.index = 2;
    await stack.updateComplete;
    expect(children[1].sectionPath).toEqual([0, 2, 1]);
  });

  it("hides only when all children are hidden, keeping them mounted to recover", async () => {
    const children = await mount();
    children[0].hidden = true;
    fireEvent(children[0], "section-visibility-changed", { value: false });
    expect(stack.hidden).toBe(false);
    children[1].hidden = true;
    fireEvent(children[1], "section-visibility-changed", { value: false });
    expect(stack.hidden).toBe(true);
    expect(children.every((child) => child.isConnected)).toBe(true);
    children[0].hidden = false;
    fireEvent(children[0], "section-visibility-changed", { value: true });
    expect(stack.hidden).toBe(false);
  });

  it("shows hidden children for editing and restores visibility afterwards", async () => {
    const children = await mount();
    children.forEach((child) => {
      child.hidden = true;
    });
    stack.preview = true;
    await stack.updateComplete;
    expect(stack.hidden).toBe(false);
    expect(children.every((child) => child.preview)).toBe(true);
    stack.preview = false;
    await stack.updateComplete;
    expect(stack.hidden).toBe(true);
  });

  it("rebuilds only the child whose custom layout became available", async () => {
    const children = await mount();
    fireEvent(children[0], "ll-rebuild");
    await stack.updateComplete;
    const rebuilt = [
      ...stack.shadowRoot!.querySelectorAll<HuiSection>("hui-section"),
    ];
    expect(rebuilt[0]).not.toBe(children[0]);
    expect(rebuilt[0].config).toBe(children[0].config);
    expect(rebuilt[1]).toBe(children[1]);
    expect(rebuilt[0].sectionPath).toEqual([0, 0, 0]);
  });

  it("adds ordinary sections through the existing add-section helper", async () => {
    await mount(true);
    stack.shadowRoot!.querySelector<HTMLButtonElement>("button")!.click();
    expect(stack.lovelace!.saveConfig).toHaveBeenCalledOnce();
    const saved = vi.mocked(stack.lovelace!.saveConfig).mock
      .calls[0][0] as LovelaceConfig;
    expect(
      (
        (saved.views[0] as LovelaceViewConfig)
          .sections![0] as LovelaceStackSectionConfig
      ).sections
    ).toHaveLength(3);
  });

  it("saves nested reorder paths and stops the event reaching the outer grid", async () => {
    await mount(true);
    const outer = vi.fn();
    stack.addEventListener("item-moved", outer);
    fireEvent(stack.shadowRoot!.querySelector("ha-sortable")!, "item-moved", {
      oldIndex: 0,
      newIndex: 1,
    });
    const saved = vi.mocked(stack.lovelace!.saveConfig).mock
      .calls[0][0] as LovelaceConfig;
    expect(
      (
        (saved.views[0] as LovelaceViewConfig)
          .sections![0] as LovelaceStackSectionConfig
      ).sections
    ).toEqual([...config.sections].reverse());
    expect(outer).not.toHaveBeenCalled();
  });

  it("rejects nested stacks when loading YAML", () => {
    stack = new StackSection();
    expect(() =>
      stack.setConfig({
        type: "stack",
        sections: [config],
      } as LovelaceStackSectionConfig)
    ).toThrow("Nested section stacks");
  });
});
