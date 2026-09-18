import { ContextProvider } from "@lit/context";
import { afterEach, describe, expect, it, vi } from "vitest";
import { internationalizationContext } from "../../../../../src/data/context";
import type { HomeAssistantInternationalization } from "../../../../../src/types";
import type { LovelaceViewConfig } from "../../../../../src/data/lovelace/config/view";
import { HuiViewEditor } from "../../../../../src/panels/lovelace/editor/view-editor/hui-view-editor";

vi.mock("../../../../../src/components/ha-form/ha-form", () => ({}));
let editor: HuiViewEditor;
let host: HTMLDivElement;
afterEach(() => host?.remove());
const mount = async (config: LovelaceViewConfig) => {
  editor = new HuiViewEditor();
  host = document.createElement("div");
  new ContextProvider(host, {
    context: internationalizationContext,
    initialValue: {
      localize: (key: string) => key,
    } as HomeAssistantInternationalization,
  });
  editor.config = config;
  document.body.append(host);
  host.append(editor);
  await editor.updateComplete;
  return editor.shadowRoot!.querySelector("ha-form")!;
};

describe("compact Sections view editing", () => {
  it("disables dense without deleting its configured value and restores it when compact is disabled", async () => {
    const config = {
      type: "sections",
      compact_section_placement: true,
      dense_section_placement: true,
    };
    const form = await mount(config);
    const specifics = form.schema.find(
      (entry) => entry.name === "section_specifics"
    )!;
    expect(
      "schema" in specifics &&
        specifics.schema.find(
          (entry) => entry.name === "dense_section_placement"
        )?.disabled
    ).toBe(true);
    expect(form.data.dense_section_placement).toBe(true);
    editor.config = { ...config, compact_section_placement: false };
    await editor.updateComplete;
    const next = form.schema.find(
      (entry) => entry.name === "section_specifics"
    )!;
    expect(
      "schema" in next &&
        next.schema.find((entry) => entry.name === "dense_section_placement")
          ?.disabled
    ).toBe(false);
    expect(form.data.dense_section_placement).toBe(true);
  });
  it("does not persist a new option merely by opening and saving an existing view", async () => {
    const form = await mount({ type: "sections", title: "Existing" });
    const changed = vi.fn();
    editor.addEventListener("view-config-changed", changed);
    form.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: { ...form.data } } })
    );
    expect(changed.mock.calls[0][0].detail.config).not.toHaveProperty(
      "compact_section_placement"
    );
  });
  it("cleans up the option when switching away from Sections", async () => {
    const form = await mount({
      type: "sections",
      compact_section_placement: true,
      dense_section_placement: true,
    });
    const changed = vi.fn();
    editor.addEventListener("view-config-changed", changed);
    form.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: { ...form.data, type: "masonry" } },
      })
    );
    expect(changed.mock.calls[0][0].detail.config).not.toHaveProperty(
      "compact_section_placement"
    );
    expect(changed.mock.calls[0][0].detail.config).not.toHaveProperty(
      "dense_section_placement"
    );
  });
});
