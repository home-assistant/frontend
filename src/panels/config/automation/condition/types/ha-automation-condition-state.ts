import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert, literal, object, optional, string, union } from "superstruct";
import { createDurationData } from "../../../../../common/datetime/create_duration_data";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { HaFormSchema } from "../../../../../components/ha-form/types";
import type { StateCondition } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import { forDictStruct } from "../../structs";
import type { ConditionElement } from "../ha-automation-condition-row";

const stateConditionStruct = object({
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

  private _schema = memoizeOne((entityId) => [
    { name: "entity_id", required: true, selector: { entity: {} } },
    {
      name: "attribute",
      selector: { attribute: { entity_id: entityId } },
    },
    { name: "state", selector: { text: {} } },
    { name: "for", selector: { duration: {} } },
  ]);

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
    const data = { ...this.condition, ...{ for: trgFor } };
    const schema = this._schema(this.condition.entity_id);

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

  private _computeLabelCallback = (schema: HaFormSchema): string => {
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
