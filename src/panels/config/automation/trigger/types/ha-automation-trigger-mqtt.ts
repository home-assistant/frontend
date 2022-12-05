import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import { MqttTrigger } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import type { TriggerElement } from "../ha-automation-trigger-row";

const SCHEMA = [
  { name: "topic", required: true, selector: { text: {} } },
  { name: "payload", selector: { text: {} } },
] as const;

@customElement("ha-automation-trigger-mqtt")
export class HaMQTTTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: MqttTrigger;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig() {
    return { topic: "" };
  }

  protected render() {
    return html`
      <ha-form
        .schema=${SCHEMA}
        .data=${this.trigger}
        .hass=${this.hass}
        .disabled=${this.disabled}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newTrigger = ev.detail.value;
    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<typeof SCHEMA>
  ): string =>
    this.hass.localize(
      `ui.panel.config.automation.editor.triggers.type.mqtt.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-mqtt": HaMQTTTrigger;
  }
}
