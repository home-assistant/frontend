import "../../../../../components/device/ha-device-picker";
import "../../../../../components/device/ha-device-action-picker";
import "../../../../../components/ha-form/ha-form";

import {
  fetchDeviceActionCapabilities,
  deviceAutomationsEqual,
  DeviceAction,
} from "../../../../../data/device_automation";
import { LitElement, customElement, property, html } from "lit-element";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { HomeAssistant } from "../../../../../types";
import memoizeOne from "memoize-one";

@customElement("ha-automation-action-device_id")
export class HaDeviceAction extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public action!: DeviceAction;
  @property() private _deviceId?: string;
  @property() private _capabilities?;
  private _origAction?: DeviceAction;

  public static get defaultConfig() {
    return {
      device_id: "",
      domain: "",
      entity_id: "",
    };
  }

  private _extraFieldsData = memoizeOne((capabilities, action: DeviceAction) =>
    capabilities && capabilities.extra_fields
      ? capabilities.extra_fields.map((item) => {
          return { [item.name]: action[item.name] };
        })
      : undefined
  );

  protected render() {
    const deviceId = this._deviceId || this.action.device_id;
    const extraFieldsData = this._extraFieldsData(
      this._capabilities,
      this.action
    );

    return html`
      <ha-device-picker
        .value=${deviceId}
        @value-changed=${this._devicePicked}
        .hass=${this.hass}
        label="Device"
      ></ha-device-picker>
      <ha-device-action-picker
        .value=${this.action}
        .deviceId=${deviceId}
        @value-changed=${this._deviceActionPicked}
        .hass=${this.hass}
        label="Action"
      ></ha-device-action-picker>
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
    if (this.action) {
      this._origAction = this.action;
    }
  }

  protected updated(changedPros) {
    const prevAction = changedPros.get("action");
    if (prevAction && !deviceAutomationsEqual(prevAction, this.action)) {
      this._getCapabilities();
    }
  }

  private async _getCapabilities() {
    this._capabilities = this.action.domain
      ? await fetchDeviceActionCapabilities(this.hass, this.action)
      : null;
  }

  private _devicePicked(ev) {
    ev.stopPropagation();
    this._deviceId = ev.target.value;
  }

  private _deviceActionPicked(ev) {
    ev.stopPropagation();
    let action = ev.detail.value;
    if (this._origAction && deviceAutomationsEqual(this._origAction, action)) {
      action = this._origAction;
    }
    fireEvent(this, "value-changed", { value: action });
  }

  private _extraFieldsChanged(ev) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: {
        ...this.action,
        ...ev.detail.value,
      },
    });
  }

  private _extraFieldsComputeLabelCallback(localize) {
    // Returns a callback for ha-form to calculate labels per schema object
    return (schema) =>
      localize(
        `ui.panel.config.automation.editor.actions.type.device.extra_fields.${schema.name}`
      ) || schema.name;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-device_id": HaDeviceAction;
  }
}
