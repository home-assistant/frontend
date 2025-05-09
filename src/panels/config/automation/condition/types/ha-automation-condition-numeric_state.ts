import type { PropertyValues } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  assert,
  boolean,
  literal,
  number,
  object,
  optional,
  string,
  union,
} from "superstruct";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import type { NumericStateCondition } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import { NON_NUMERIC_ATTRIBUTES } from "../../../../../data/entity_attributes";

const numericStateConditionStruct = object({
  alias: optional(string()),
  condition: literal("numeric_state"),
  entity_id: optional(string()),
  attribute: optional(string()),
  above: optional(union([number(), string()])),
  below: optional(union([number(), string()])),
  value_template: optional(string()),
  enabled: optional(boolean()),
});

@customElement("ha-automation-condition-numeric_state")
export default class HaNumericStateCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: NumericStateCondition;

  @property({ type: Boolean }) public disabled = false;

  @state() private _inputAboveIsEntity?: boolean;

  @state() private _inputBelowIsEntity?: boolean;

  public static get defaultConfig(): NumericStateCondition {
    return {
      condition: "numeric_state",
      entity_id: "",
    };
  }

  public shouldUpdate(changedProperties: PropertyValues) {
    if (changedProperties.has("condition")) {
      try {
        assert(this.condition, numericStateConditionStruct);
      } catch (e: any) {
        fireEvent(this, "ui-mode-not-available", e);
        return false;
      }
    }
    return true;
  }

  private _data = memoizeOne(
    (
      inputAboveIsEntity: boolean,
      inputBelowIsEntity: boolean,
      condition: NumericStateCondition
    ) => ({
      lower_limit: inputAboveIsEntity ? "input" : "value",
      upper_limit: inputBelowIsEntity ? "input" : "value",
      ...condition,
    })
  );

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      inputAboveIsEntity?: boolean,
      inputBelowIsEntity?: boolean
    ) =>
      [
        { name: "entity_id", required: true, selector: { entity: {} } },
        {
          name: "attribute",
          selector: {
            attribute: {
              hide_attributes: NON_NUMERIC_ATTRIBUTES,
            },
          },
          context: {
            filter_entity: "entity_id",
          },
        },
        {
          name: "lower_limit",
          type: "select",
          required: true,
          options: [
            [
              "value",
              localize(
                "ui.panel.config.automation.editor.conditions.type.numeric_state.type_value"
              ),
            ],
            [
              "input",
              localize(
                "ui.panel.config.automation.editor.conditions.type.numeric_state.type_input"
              ),
            ],
          ],
        },
        ...(inputAboveIsEntity
          ? ([
              {
                name: "above",
                selector: {
                  entity: { domain: ["input_number", "number", "sensor"] },
                },
              },
            ] as const)
          : ([
              {
                name: "above",
                selector: {
                  number: {
                    mode: "box",
                    min: Number.MIN_SAFE_INTEGER,
                    max: Number.MAX_SAFE_INTEGER,
                    step: 0.1,
                  },
                },
              },
            ] as const)),
        {
          name: "upper_limit",
          type: "select",
          required: true,
          options: [
            [
              "value",
              localize(
                "ui.panel.config.automation.editor.conditions.type.numeric_state.type_value"
              ),
            ],
            [
              "input",
              localize(
                "ui.panel.config.automation.editor.conditions.type.numeric_state.type_input"
              ),
            ],
          ],
        },
        ...(inputBelowIsEntity
          ? ([
              {
                name: "below",
                selector: {
                  entity: { domain: ["input_number", "number", "sensor"] },
                },
              },
            ] as const)
          : ([
              {
                name: "below",
                selector: {
                  number: {
                    mode: "box",
                    min: Number.MIN_SAFE_INTEGER,
                    max: Number.MAX_SAFE_INTEGER,
                    step: 0.1,
                  },
                },
              },
            ] as const)),
        {
          name: "value_template",
          selector: { template: {} },
        },
      ] as const
  );

  public willUpdate() {
    this._inputAboveIsEntity =
      this._inputAboveIsEntity ??
      (typeof this.condition.above === "string" &&
        ((this.condition.above as string).startsWith("input_number.") ||
          (this.condition.above as string).startsWith("number.") ||
          (this.condition.above as string).startsWith("sensor.")));
    this._inputBelowIsEntity =
      this._inputBelowIsEntity ??
      (typeof this.condition.below === "string" &&
        ((this.condition.below as string).startsWith("input_number.") ||
          (this.condition.below as string).startsWith("number.") ||
          (this.condition.below as string).startsWith("sensor.")));
  }

  public render() {
    const schema = this._schema(
      this.hass.localize,
      this._inputAboveIsEntity,
      this._inputBelowIsEntity
    );

    const data = this._data(
      this._inputAboveIsEntity!,
      this._inputBelowIsEntity!,
      this.condition
    );

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newCondition = { ...ev.detail.value };

    this._inputAboveIsEntity = newCondition.lower_limit === "input";
    this._inputBelowIsEntity = newCondition.upper_limit === "input";

    delete newCondition.lower_limit;
    delete newCondition.upper_limit;

    if (newCondition.value_template === "") {
      delete newCondition.value_template;
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
      default:
        return this.hass.localize(
          `ui.panel.config.automation.editor.triggers.type.numeric_state.${schema.name}`
        );
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-numeric_state": HaNumericStateCondition;
  }
}
