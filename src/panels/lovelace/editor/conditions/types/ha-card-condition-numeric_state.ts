import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert, literal, number, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-form/ha-form";
import type {
  SchemaUnion,
  HaFormSchema,
} from "../../../../../components/ha-form/types";
import { NON_NUMERIC_ATTRIBUTES } from "../../../../../data/entity/entity_attributes";
import type { HomeAssistant } from "../../../../../types";
import type {
  NumericStateCondition,
  StateCondition,
} from "../../../common/validate-condition";

const numericStateConditionStruct = object({
  condition: literal("numeric_state"),
  entity: optional(string()),
  attribute: optional(string()),
  above: optional(number()),
  below: optional(number()),
});

@customElement("ha-card-condition-numeric_state")
export class HaCardConditionNumericState extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: NumericStateCondition;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: "no-entity", type: Boolean }) public noEntity = false;

  @property({ attribute: false }) public entityIds: string[] = [];

  public static get defaultConfig(): NumericStateCondition {
    return { condition: "numeric_state", entity: "" };
  }

  protected static validateUIConfig(condition: StateCondition) {
    return assert(condition, numericStateConditionStruct);
  }

  private _schema = memoizeOne(
    (noEntity: boolean, unit?: string) =>
      [
        ...(noEntity
          ? []
          : [
              { name: "entity", selector: { entity: {} } },
              {
                name: "attribute",
                selector: {
                  attribute: {
                    hide_attributes: NON_NUMERIC_ATTRIBUTES,
                  },
                },
                context: {
                  filter_entity: "entity",
                },
              },
            ]),
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "above",
              selector: {
                number: {
                  step: "any",
                  mode: "box",
                  unit_of_measurement: unit,
                },
              },
            },
            {
              name: "below",
              selector: {
                number: {
                  step: "any",
                  mode: "box",
                  unit_of_measurement: unit,
                },
              },
            },
          ],
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    const stateObj = this.condition.entity
      ? this.hass.states[this.condition.entity]
      : undefined;

    const unit = this.condition.attribute
      ? undefined
      : stateObj?.attributes.unit_of_measurement;

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.condition}
        .schema=${this._schema(this.noEntity, unit)}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const condition = { ...ev.detail.value } as NumericStateCondition;
    if (!condition.attribute) {
      delete condition.attribute;
    }
    fireEvent(this, "value-changed", { value: condition });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => {
    switch (schema.name) {
      case "entity":
        return this.hass.localize("ui.components.entity.entity-picker.entity");
      case "attribute":
        return this.hass.localize(
          "ui.panel.lovelace.editor.condition-editor.condition.numeric_state.attribute"
        );
      case "below":
      case "above":
        return this.hass.localize(
          `ui.panel.lovelace.editor.condition-editor.condition.numeric_state.${schema.name}`
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-numeric_state": HaCardConditionNumericState;
  }
}
