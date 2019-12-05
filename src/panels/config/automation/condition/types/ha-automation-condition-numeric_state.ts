import "@polymer/paper-input/paper-input";
import "../../../../../components/ha-textarea";

import "../../../../../components/entity/ha-entity-picker";
import { LitElement, html, customElement, property } from "lit-element";
import { HomeAssistant } from "../../../../../types";
import { fireEvent } from "../../../../../common/dom/fire_event";
import {
  NumericStateCondition,
  handleChangeEvent,
} from "../ha-automation-condition-row";

@customElement("ha-automation-condition-numeric_state")
export default class HaNumericStateCondition extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public condition!: NumericStateCondition;

  public static get defaultConfig() {
    return {
      entity_id: "",
    };
  }

  public render() {
    const { value_template, entity_id, below, above } = this.condition;

    return html`
      <ha-entity-picker
        .value="${entity_id}"
        @value-changed="${this._entityPicked}"
        .hass="${this.hass}"
        allow-custom-entity
      ></ha-entity-picker>
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.numeric_state.above"
        )}
        name="above"
        .value=${above}
        @value-changed=${this._valueChanged}
      ></paper-input>
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.numeric_state.below"
        )}
        name="below"
        .value=${below}
        @value-changed=${this._valueChanged}
      ></paper-input>
      <ha-textarea
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.numeric_state.value_template"
        )}
        name="value_template"
        .value=${value_template}
        @value-changed=${this._valueChanged}
        dir="ltr"
      ></ha-textarea>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }

  private _entityPicked(ev) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.condition, entity_id: ev.detail.value },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-numeric_state": HaNumericStateCondition;
  }
}
