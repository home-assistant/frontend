import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert, literal, number, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import { HaFormSchema } from "../../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../../types";
import {
  NumericStateCondition,
  StateCondition,
} from "../../../common/validate-condition";

const numericStateConditionStruct = object({
  condition: literal("numeric_state"),
  entity: optional(string()),
  above: optional(number()),
  below: optional(number()),
});

@customElement("ha-card-condition-numeric_state")
export class HaCardConditionNumericState extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: NumericStateCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): NumericStateCondition {
    return { condition: "numeric_state", entity: "" };
  }

  protected static validateUIConfig(condition: StateCondition) {
    return assert(condition, numericStateConditionStruct);
  }

  private _schema = memoizeOne(
    (stateObj?: HassEntity) =>
      [
        { name: "entity", selector: { entity: {} } },
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
                  unit_of_measurement: stateObj?.attributes.unit_of_measurement,
                },
              },
            },
            {
              name: "below",
              selector: {
                number: {
                  step: "any",
                  mode: "box",
                  unit_of_measurement: stateObj?.attributes.unit_of_measurement,
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

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.condition}
        .schema=${this._schema(stateObj)}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const condition = ev.detail.value as NumericStateCondition;
    fireEvent(this, "value-changed", { value: condition });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => {
    switch (schema.name) {
      case "entity":
        return this.hass.localize("ui.components.entity.entity-picker.entity");
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
