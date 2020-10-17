import "@polymer/paper-input/paper-input";
import "@polymer/paper-input/paper-textarea";
import { customElement, html, LitElement, property } from "lit-element";
import "../../../../../components/entity/ha-entity-picker";
import { ForDict, NumericStateTrigger } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import { handleChangeEvent } from "../ha-automation-trigger-row";

@customElement("ha-automation-trigger-numeric_state")
export default class HaNumericStateTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: NumericStateTrigger;

  public static get defaultConfig() {
    return {
      entity_id: "",
    };
  }

  public render() {
    const { value_template, entity_id, attribute, below, above } = this.trigger;
    let trgFor = this.trigger.for;

    if (
      trgFor &&
      ((trgFor as ForDict).hours ||
        (trgFor as ForDict).minutes ||
        (trgFor as ForDict).seconds)
    ) {
      // If the trigger was defined using the yaml dict syntax, convert it to
      // the equivalent string format
      let { hours = 0, minutes = 0, seconds = 0 } = trgFor as ForDict;
      hours = hours.toString();
      minutes = minutes.toString().padStart(2, "0");
      seconds = seconds.toString().padStart(2, "0");

      trgFor = `${hours}:${minutes}:${seconds}`;
    }
    return html`
      <ha-entity-picker
        .value="${entity_id}"
        @value-changed="${this._valueChanged}"
        .name=${"entity_id"}
        .hass=${this.hass}
        allow-custom-entity
      ></ha-entity-picker>
      <ha-entity-attribute-picker
        .hass=${this.hass}
        .entityId=${entity_id}
        .value=${attribute}
        .name=${"attribute"}
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.state.attribute"
        )}
        @value-changed=${this._valueChanged}
        allow-custom-value
      ></ha-entity-attribute-picker>
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.numeric_state.above"
        )}
        name="above"
        .value=${above}
        @value-changed=${this._valueChanged}
      ></paper-input>
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.numeric_state.below"
        )}
        name="below"
        .value=${below}
        @value-changed=${this._valueChanged}
      ></paper-input>
      <paper-textarea
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.numeric_state.value_template"
        )}
        name="value_template"
        .value=${value_template}
        @value-changed=${this._valueChanged}
        dir="ltr"
      ></paper-textarea>
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.state.for"
        )}
        name="for"
        .value=${trgFor}
        @value-changed=${this._valueChanged}
      ></paper-input>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-numeric_state": HaNumericStateTrigger;
  }
}
