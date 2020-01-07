import "../../../../../components/device/ha-device-picker";
import "../../../../../components/device/ha-device-trigger-picker";
import "../../../../../components/ha-form/ha-form";

import {
  fetchDeviceTriggerCapabilities,
  deviceAutomationsEqual,
  DeviceTrigger,
} from "../../../../../data/device_automation";
import { LitElement, customElement, property, html } from "lit-element";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { HomeAssistant } from "../../../../../types";

@customElement("ha-automation-trigger-device")
export class HaDeviceTrigger extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public trigger!: DeviceTrigger;
  @property() private _deviceId?: string;
  @property() private _capabilities?;
  private _origTrigger?: DeviceTrigger;

  public static get defaultConfig() {
    return {
      device_id: "",
      domain: "",
      entity_id: "",
    };
  }

  protected render() {
    const deviceId = this._deviceId || this.trigger.device_id;

    const extraFieldsData =
      this._capabilities && this._capabilities.extra_fields
        ? this._capabilities.extra_fields.map((item) => {
            return { [item.name]: this.trigger[item.name] };
          })
        : undefined;

    return html`
      <ha-device-picker
        .value=${deviceId}
        @value-changed=${this._devicePicked}
        .hass=${this.hass}
        label="Device"
      ></ha-device-picker>
      <ha-device-trigger-picker
        .value=${this.trigger}
        .deviceId=${deviceId}
        @value-changed=${this._deviceTriggerPicked}
        .hass=${this.hass}
        label="Trigger"
      ></ha-device-trigger-picker>
      ${extraFieldsData
        ? html`
            <ha-form
              .data=${Object.assign({}, ...extraFieldsData)}
              .schema=${this._capabilities.extra_fields}
              .computeLabel=${this._extraFieldsComputeLabelCallback(
                this.hass.localize
              )}
              @value-changed=${this._extraFieldsChanged}
            ></ha-form>
          `
        : ""}
    `;
  }

  protected firstUpdated() {
    if (!this._capabilities) {
      this._getCapabilities();
    }
    if (this.trigger) {
      this._origTrigger = this.trigger;
    }
  }

  protected updated(changedPros) {
    const prevTrigger = changedPros.get("trigger");
    if (prevTrigger && !deviceAutomationsEqual(prevTrigger, this.trigger)) {
      this._getCapabilities();
    }
  }

  private async _getCapabilities() {
    const trigger = this.trigger;

    this._capabilities = trigger.domain
      ? await fetchDeviceTriggerCapabilities(this.hass, trigger)
      : null;
  }

  private _devicePicked(ev) {
    ev.stopPropagation();
    this._deviceId = ev.target.value;
  }

  private _deviceTriggerPicked(ev) {
    ev.stopPropagation();
    let trigger = ev.detail.value;
    if (
      this._origTrigger &&
      deviceAutomationsEqual(this._origTrigger, trigger)
    ) {
      trigger = this._origTrigger;
    }
    fireEvent(this, "value-changed", { value: trigger });
  }

  private _extraFieldsChanged(ev) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: {
        ...this.trigger,
        ...ev.detail.value,
      },
    });
  }

  private _extraFieldsComputeLabelCallback(localize) {
    // Returns a callback for ha-form to calculate labels per schema object
    return (schema) =>
      localize(
        `ui.panel.config.automation.editor.triggers.type.device.extra_fields.${schema.name}`
      ) || schema.name;
  }
}
