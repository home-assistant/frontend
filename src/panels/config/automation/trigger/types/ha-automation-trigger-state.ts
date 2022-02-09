import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import {
  assert,
  assign,
  literal,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { hasTemplate } from "../../../../../common/string/has-template";
import { StateTrigger } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import { baseTriggerStruct, forDictStruct } from "../../structs";
import { TriggerElement } from "../ha-automation-trigger-row";
import "../../../../../components/ha-form/ha-form";

const stateTriggerStruct = assign(
  baseTriggerStruct,
  object({
    platform: literal("state"),
    entity_id: optional(string()),
    attribute: optional(string()),
    from: optional(string()),
    to: optional(string()),
    for: optional(union([string(), forDictStruct])),
  })
);

const SCHEMA = [
  { name: "entity_id", selector: { entity: {} } },
  { name: "from", selector: { text: { optional: true } } },
  { name: "to", selector: { text: { optional: true } } },
  { name: "for", selector: { duration: { optional: true } } },
];

@customElement("ha-automation-trigger-state")
export class HaStateTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: StateTrigger;

  public static get defaultConfig() {
    return { entity_id: "" };
  }

  public shouldUpdate(changedProperties: PropertyValues) {
    if (!changedProperties.has("trigger")) {
      return true;
    }
    if (
      this.trigger.for &&
      typeof this.trigger.for === "object" &&
      this.trigger.for.milliseconds === 0
    ) {
      delete this.trigger.for.milliseconds;
    }
    // Check for templates in trigger. If found, revert to YAML mode.
    if (this.trigger && hasTemplate(this.trigger)) {
      fireEvent(
        this,
        "ui-mode-not-available",
        Error(this.hass.localize("ui.errors.config.no_template_editor_support"))
      );
      return false;
    }
    try {
      assert(this.trigger, stateTriggerStruct);
    } catch (e: any) {
      fireEvent(this, "ui-mode-not-available", e);
      return false;
    }
    return true;
  }

  protected render() {
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.trigger}
        .schema=${SCHEMA}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const values = ev.detail.value as any;
    let newTrigger = { ...this.trigger };

    for (const key of Object.keys(values)) {
      const value = values[key];

      if (value === this.trigger![key]) {
        continue;
      }

      if (values[key] === undefined) {
        delete newTrigger[key];
      } else {
        newTrigger = { ...newTrigger, [key]: value };
      }
    }
    fireEvent(this, "value-changed", { value: newTrigger });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-state": HaStateTrigger;
  }
}
