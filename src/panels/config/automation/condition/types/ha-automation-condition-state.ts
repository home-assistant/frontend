import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert, literal, object, optional, string, union } from "superstruct";
import { createDurationData } from "../../../../../common/datetime/create_duration_data";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import type { StateCondition } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import { forDictStruct } from "../../structs";
import type { ConditionElement } from "../ha-automation-condition-row";

const stateConditionStruct = object({
  alias: optional(string()),
  condition: literal("state"),
  entity_id: optional(string()),
  attribute: optional(string()),
  state: optional(string()),
  for: optional(union([string(), forDictStruct])),
});

@customElement("ha-automation-condition-state")
export class HaStateCondition extends LitElement implements ConditionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: StateCondition;

  public static get defaultConfig() {
    return { entity_id: "", state: "" };
  }

  private _schema = memoizeOne(
    (entityId, attribute) =>
      [
        { name: "entity_id", required: true, selector: { entity: {} } },
        {
          name: "attribute",
          selector: {
            attribute: {
              entity_id: entityId,
              hide_attributes: [
                "access_token",
                "available_modes",
                "color_modes",
                "editable",
                "effect_list",
                "entity_picture",
                "fan_modes",
                "fan_speed_list",
                "forecast",
                "friendly_name",
                "hvac_modes",
                "icon",
                "operation_list",
                "options",
                "preset_modes",
                "sound_mode_list",
                "source_list",
                "state_class",
                "swing_modes",
                "token",
              ],
            },
          },
        },
        {
          name: "state",
          required: true,
          selector: {
            state: { entity_id: entityId, attribute: attribute },
          },
        },
        { name: "for", selector: { duration: {} } },
      ] as const
  );

  public shouldUpdate(changedProperties: PropertyValues) {
    if (changedProperties.has("condition")) {
      try {
        assert(this.condition, stateConditionStruct);
      } catch (e: any) {
        fireEvent(this, "ui-mode-not-available", e);
        return false;
      }
    }
    return true;
  }

  protected render() {
    const trgFor = createDurationData(this.condition.for);
    const data = { ...this.condition, for: trgFor };
    const schema = this._schema(
      this.condition.entity_id,
      this.condition.attribute
    );

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
    const newCondition = ev.detail.value;

    Object.keys(newCondition).forEach((key) =>
      newCondition[key] === undefined || newCondition[key] === ""
        ? delete newCondition[key]
        : {}
    );

    // We should not cleanup state in the above, as it is required.
    // Set it to empty string if it is undefined.
    if (!newCondition.state) {
      newCondition.state = "";
    }

    fireEvent(this, "value-changed", { value: newCondition });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => {
    switch (schema.name) {
      case "entity_id":
        return this.hass.localize("ui.components.entity.entity-picker.entity");
      case "attribute":
        return this.hass.localize(
          "ui.components.entity.entity-attribute-picker.attribute"
        );
      case "for":
        return this.hass.localize(
          `ui.panel.config.automation.editor.triggers.type.state.for`
        );
      default:
        return this.hass.localize(
          `ui.panel.config.automation.editor.conditions.type.state.${schema.name}`
        );
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-state": HaStateCondition;
  }
}
