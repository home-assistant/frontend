import type { PropertyValues } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import {
  assert,
  boolean,
  literal,
  number,
  object,
  optional,
  string,
  union,
  array,
} from "superstruct";
import { createDurationData } from "../../../../../common/datetime/create_duration_data";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import type { StateCondition } from "../../../../../data/automation";
import { STATE_CONDITION_HIDDEN_ATTRIBUTES } from "../../../../../data/entity/entity_attributes";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type { HomeAssistant } from "../../../../../types";
import { forDictStruct } from "../../structs";
import type { ConditionElement } from "../ha-automation-condition-row";

const stateConditionStruct = object({
  alias: optional(string()),
  condition: literal("state"),
  entity_id: optional(string()),
  attribute: optional(string()),
  state: optional(union([string(), array(string())])),
  for: optional(union([number(), string(), forDictStruct])),
  enabled: optional(boolean()),
});

export const SCHEMA = [
  { name: "entity_id", required: true, selector: { entity: {} } },
  {
    name: "attribute",
    selector: {
      attribute: {
        hide_attributes: STATE_CONDITION_HIDDEN_ATTRIBUTES,
      },
    },
    context: {
      filter_entity: "entity_id",
    },
  },
  {
    name: "state",
    required: true,
    selector: {
      state: { multiple: true },
    },
    context: {
      filter_entity: "entity_id",
      filter_attribute: "attribute",
    },
  },
  { name: "for", selector: { duration: {} } },
] as const;

export const computeLabel = (
  fieldName: string,
  localize: LocalizeFunc
): string => {
  switch (fieldName) {
    case "entity_id":
      return localize("ui.components.entity.entity-picker.entity");
    case "attribute":
      return localize("ui.components.entity.entity-attribute-picker.attribute");
    case "for":
      return localize(
        "ui.panel.config.automation.editor.triggers.type.state.for"
      );
    default:
      return localize(
        `ui.panel.config.automation.editor.conditions.type.state.${fieldName}` as any
      );
  }
};

@customElement("ha-automation-condition-state")
export class HaStateCondition extends LitElement implements ConditionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: StateCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): StateCondition {
    return { condition: "state", entity_id: "", state: [] };
  }

  public shouldUpdate(changedProperties: PropertyValues<this>) {
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
    const data = {
      ...this.condition,
      state: ensureArray(this.condition.state) || [],
      for: trgFor,
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${SCHEMA}
        .disabled=${this.disabled}
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

    // Ensure `state` stays an array for multi-select. If absent, set to []
    if (newCondition.state === undefined || newCondition.state === "") {
      newCondition.state = [];
    }

    fireEvent(this, "value-changed", { value: newCondition });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<typeof SCHEMA>
  ): string => computeLabel(schema.name, this.hass.localize);
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-state": HaStateCondition;
  }
}
