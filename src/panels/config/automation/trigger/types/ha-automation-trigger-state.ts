import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import {
  array,
  assert,
  assign,
  literal,
  object,
  optional,
  string,
  union,
} from "superstruct";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../../../common/ensure-array";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { hasTemplate } from "../../../../../common/string/has-template";
import { StateTrigger } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import { baseTriggerStruct, forDictStruct } from "../../structs";
import { TriggerElement } from "../ha-automation-trigger-row";
import "../../../../../components/ha-form/ha-form";
import { createDurationData } from "../../../../../common/datetime/create_duration_data";
import type { SchemaUnion } from "../../../../../components/ha-form/types";

const stateTriggerStruct = assign(
  baseTriggerStruct,
  object({
    alias: optional(string()),
    platform: literal("state"),
    entity_id: optional(union([string(), array(string())])),
    attribute: optional(string()),
    from: optional(string()),
    to: optional(string()),
    for: optional(union([string(), forDictStruct])),
  })
);

@customElement("ha-automation-trigger-state")
export class HaStateTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: StateTrigger;

  public static get defaultConfig() {
    return { entity_id: [] };
  }

  private _schema = memoizeOne(
    (entityId, attribute) =>
      [
        {
          name: "entity_id",
          required: true,
          selector: { entity: { multiple: true } },
        },
        {
          name: "attribute",
          selector: {
            attribute: {
              entity_id: entityId ? entityId[0] : undefined,
              hide_attributes: [
                "access_token",
                "available_modes",
                "color_modes",
                "device_class",
                "editable",
                "effect_list",
                "entity_picture",
                "fan_modes",
                "fan_speed_list",
                "friendly_name",
                "has_date",
                "has_time",
                "hvac_modes",
                "icon",
                "operation_list",
                "options",
                "preset_modes",
                "sound_mode_list",
                "source_list",
                "state_class",
                "supported_features",
                "swing_modes",
                "token",
                "unit_of_measurement",
              ],
            },
          },
        },
        {
          name: "from",
          selector: {
            state: {
              entity_id: entityId ? entityId[0] : undefined,
              attribute: attribute,
            },
          },
        },
        {
          name: "to",
          selector: {
            state: {
              entity_id: entityId ? entityId[0] : undefined,
              attribute: attribute,
            },
          },
        },
        { name: "for", selector: { duration: {} } },
      ] as const
  );

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
    const trgFor = createDurationData(this.trigger.for);

    const data = {
      ...this.trigger,
      entity_id: ensureArray(this.trigger.entity_id),
      for: trgFor,
    };
    const schema = this._schema(this.trigger.entity_id, this.trigger.attribute);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newTrigger = ev.detail.value;

    Object.keys(newTrigger).forEach((key) =>
      newTrigger[key] === undefined || newTrigger[key] === ""
        ? delete newTrigger[key]
        : {}
    );

    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
      schema.name === "entity_id"
        ? "ui.components.entity.entity-picker.entity"
        : `ui.panel.config.automation.editor.triggers.type.state.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-state": HaStateTrigger;
  }
}
