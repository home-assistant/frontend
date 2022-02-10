import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { HaFormSchema } from "../../../../../components/ha-form/types";
import { MqttTrigger } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import { TriggerElement } from "../ha-automation-trigger-row";

const SCHEMA: HaFormSchema[] = [
  { name: "topic", selector: { text: {} } },
  { name: "payload", required: false, selector: { text: {} } },
];

@customElement("ha-automation-trigger-mqtt")
export class HaMQTTTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: MqttTrigger;

  public static get defaultConfig() {
    return { topic: "" };
  }

  protected render() {
    return html`
      <ha-form
        .schema=${SCHEMA}
        .data=${this.trigger}
        .hass=${this.hass}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newTrigger = ev.detail.value;
    Object.keys(newTrigger).forEach((key) =>
      newTrigger[key] === undefined || newTrigger[key] === ""
        ? delete newTrigger[key]
        : {}
    );
    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private _computeLabelCallback(schema: HaFormSchema): string {
    return this.hass.localize(
      `ui.panel.config.automation.editor.triggers.type.mqtt.${schema.name}`
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-mqtt": HaMQTTTrigger;
  }
}
