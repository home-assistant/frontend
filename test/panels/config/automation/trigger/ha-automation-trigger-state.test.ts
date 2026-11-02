import { describe, expect, it } from "vitest";
import "../../../../../src/components/ha-form/ha-form";
import type { HaForm } from "../../../../../src/components/ha-form/ha-form";
import type { StateTrigger } from "../../../../../src/data/automation";
import { HaStateTrigger } from "../../../../../src/panels/config/automation/trigger/types/ha-automation-trigger-state";
import type { HomeAssistant } from "../../../../../src/types";

const HASS = { localize: (key: string) => key } as unknown as HomeAssistant;

const createEditor = (trigger: StateTrigger) => {
  const editor = new HaStateTrigger();
  editor.hass = HASS;
  editor.trigger = trigger;
  return editor;
};

// The data object render() passes to ha-form.
const formData = (editor: HaStateTrigger) =>
  ((editor as any).render() as { values: unknown[] }).values.find(
    (value: any) => value?.trigger === "state"
  ) as Record<string, any>;

describe("ha-automation-trigger-state", () => {
  it("keeps match values when ha-form fires again before new data", () => {
    const editor = createEditor({
      trigger: "state",
      entity_id: ["light.a"],
      attribute: "brightness",
      from: "50",
      not_to: ["off"],
      for: { hours: 0, minutes: 1, seconds: 0 },
    });

    // Real ha-form listener, not connected so it never renders.
    const form = document.createElement("ha-form") as HaForm;
    form.data = formData(editor);
    const root = (form as any).createRenderRoot() as ShadowRoot;
    form.addEventListener("value-changed", (ev) =>
      (editor as any)._valueChanged(ev)
    );
    const values: any[] = [];
    editor.addEventListener("value-changed", (ev) =>
      values.push((ev as CustomEvent).detail.value)
    );

    const child = (name: string) => {
      const el = document.createElement("div") as any;
      el.schema = { name, selector: {} };
      root.append(el);
      return el as HTMLElement;
    };
    const fire = (el: HTMLElement, value: unknown) =>
      el.dispatchEvent(
        new CustomEvent("value-changed", {
          detail: { value },
          bubbles: true,
          composed: true,
        })
      );

    // The entity changes, then the attribute selector clears the attribute
    // before the new trigger is passed down.
    fire(child("entity_id"), ["light.b"]);
    fire(child("attribute"), undefined);

    expect(values).toHaveLength(2);
    expect(values[1]).toEqual({
      trigger: "state",
      entity_id: ["light.b"],
      from: ["50"],
      not_to: ["off"],
      for: { hours: 0, minutes: 1, seconds: 0 },
    });
  });
});
