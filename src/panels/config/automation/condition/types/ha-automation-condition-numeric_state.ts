import "../../../../../components/ha-form/ha-form";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { NumericStateCondition } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { SchemaUnion } from "../../../../../components/ha-form/types";

@customElement("ha-automation-condition-numeric_state")
export default class HaNumericStateCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: NumericStateCondition;

  public static get defaultConfig() {
    return {
      entity_id: "",
    };
  }

  private _schema = memoizeOne(
    (entityId) =>
      [
        { name: "entity_id", required: true, selector: { entity: {} } },
        {
          name: "attribute",
          selector: { attribute: { entity_id: entityId } },
        },
        {
          name: "above",
          selector: {
            number: {
              mode: "box",
              min: Number.MIN_SAFE_INTEGER,
              max: Number.MAX_SAFE_INTEGER,
              step: 0.01,
            },
          },
        },
        {
          name: "below",
          selector: {
            number: {
              mode: "box",
              min: Number.MIN_SAFE_INTEGER,
              max: Number.MAX_SAFE_INTEGER,
              step: 0.01,
            },
          },
        },
        {
          name: "value_template",
          selector: { text: { multiline: true } },
        },
      ] as const
  );

  public render() {
    const schema = this._schema(this.condition.entity_id);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.condition}
        .schema=${schema}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newTrigger = ev.detail.value;
    fireEvent(this, "value-changed", { value: newTrigger });
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
