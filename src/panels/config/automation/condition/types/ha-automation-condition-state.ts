import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  array,
  assert,
  boolean,
  literal,
  number,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { createDurationData } from "../../../../../common/datetime/create_duration_data";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import type { StateCondition } from "../../../../../data/automation";
import { STATE_CONDITION_HIDDEN_ATTRIBUTES } from "../../../../../data/entity/entity_attributes";
import type { HomeAssistant } from "../../../../../types";
import { forDictStruct } from "../../structs";
import type { ConditionElement } from "../ha-automation-condition-row";

const stateConditionStruct = object({
  alias: optional(string()),
  note: optional(string()),
  condition: literal("state"),
  entity_id: optional(string()),
  attribute: optional(string()),
  state: optional(union([string(), array(string())])),
  for: optional(union([number(), string(), forDictStruct])),
  enabled: optional(boolean()),
});

const SCHEMA = memoizeOne(
  (hasAttribute: boolean) =>
    [
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
      // `for` is not supported together with `attribute`: the legacy state
      // condition measures the duration against `last_changed`, which only
      // updates on state changes, not attribute changes.
      ...(hasAttribute
        ? ([] as const)
        : ([{ name: "for", selector: { duration: {} } }] as const)),
    ] as const
);

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
    const hasAttribute = !!this.condition.attribute;
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
        .schema=${SCHEMA(hasAttribute)}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
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

    // `for` is not supported together with `attribute` for the legacy state
    // condition, so drop any lingering duration when an attribute is set.
    if (newCondition.attribute) {
      delete newCondition.for;
    }

    // Ensure `state` stays an array for multi-select. If absent, set to []
    if (newCondition.state === undefined || newCondition.state === "") {
      newCondition.state = [];
    }

    fireEvent(this, "value-changed", { value: newCondition });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof SCHEMA>>
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

  private _computeHelperCallback = (
    schema: SchemaUnion<ReturnType<typeof SCHEMA>>
  ): string | undefined => {
    if (schema.name === "attribute" && this.condition.attribute) {
      return this.hass.localize(
        "ui.panel.config.automation.editor.conditions.type.state.attribute_no_for"
      );
    }
    return undefined;
  };

  static styles = css`
    :host {
      display: block;
      margin-bottom: var(--ha-space-3);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-state": HaStateCondition;
  }
}
