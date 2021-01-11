import "@polymer/paper-input/paper-input";
import { customElement, html, LitElement, property } from "lit-element";
import "../../../../../components/entity/ha-entity-attribute-picker";
import "../../../../../components/entity/ha-entity-picker";
import { ForDict, StateCondition } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import {
  ConditionElement,
  handleChangeEvent,
} from "../ha-automation-condition-row";

@customElement("ha-automation-condition-state")
export class HaStateCondition extends LitElement implements ConditionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public condition!: StateCondition;

  public static get defaultConfig() {
    return { entity_id: "", state: "" };
  }

  protected render() {
    const { entity_id, attribute, state } = this.condition;
    let forTime = this.condition.for;

    if (
      forTime &&
      ((forTime as ForDict).hours ||
        (forTime as ForDict).minutes ||
        (forTime as ForDict).seconds)
    ) {
      // If the trigger was defined using the yaml dict syntax, convert it to
      // the equivalent string format
      let { hours = 0, minutes = 0, seconds = 0 } = forTime as ForDict;
      hours = hours.toString().padStart(2, "0");
      minutes = minutes.toString().padStart(2, "0");
      seconds = seconds.toString().padStart(2, "0");

      forTime = `${hours}:${minutes}:${seconds}`;
    }

    return html`
      <ha-entity-picker
        .value=${entity_id}
        .name=${"entity_id"}
        @value-changed=${this._valueChanged}
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
          "ui.panel.config.automation.editor.conditions.type.state.state"
        )}
        .name=${"state"}
        .value=${state}
        @value-changed=${this._valueChanged}
      ></paper-input>
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.state.for"
        )}
        .name=${"for"}
        .value=${forTime}
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
    "ha-automation-condition-state": HaStateCondition;
  }
}
