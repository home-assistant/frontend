import "@polymer/paper-input/paper-input";
import { customElement, html, LitElement, property } from "lit-element";
import { MqttTrigger } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import {
  handleChangeEvent,
  TriggerElement,
} from "../ha-automation-trigger-row";

@customElement("ha-automation-trigger-mqtt")
export class HaMQTTTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: MqttTrigger;

  public static get defaultConfig() {
    return { topic: "" };
  }

  protected render() {
    const { topic, payload } = this.trigger;
    return html`
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.mqtt.topic"
        )}
        name="topic"
        .value=${topic}
        @value-changed=${this._valueChanged}
      ></paper-input>
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.mqtt.payload"
        )}
        name="payload"
        .value=${payload}
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
    "ha-automation-trigger-mqtt": HaMQTTTrigger;
  }
}
