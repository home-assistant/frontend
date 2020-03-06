import "../../../../../components/device/ha-device-picker";
import "../../../../../components/device/ha-device-condition-picker";
import "../../../../../components/ha-form/ha-form";

import {
  fetchDeviceConditionCapabilities,
  deviceAutomationsEqual,
  DeviceCondition,
} from "../../../../../data/device_automation";
import { LitElement, customElement, property, html } from "lit-element";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { HomeAssistant } from "../../../../../types";

@customElement("ha-automation-condition-device")
export class HaDeviceCondition extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public condition!: DeviceCondition;
  @property() private _deviceId?: string;
  @property() private _capabilities?;
  private _origCondition?: DeviceCondition;

  public static get defaultConfig() {
    return {
      device_id: "",
      domain: "",
      entity_id: "",
    };
  }

  protected render() {
    const deviceId = this._deviceId || this.condition.device_id;

    const extraFieldsData =
      this._capabilities && this._capabilities.extra_fields
        ? this._capabilities.extra_fields.map((item) => {
            return { [item.name]: this.condition[item.name] };
          })
        : undefined;

    return html`
      <ha-device-picker
        .value=${deviceId}
        @value-changed=${this._devicePicked}
        .hass=${this.hass}
        label="Device"
      ></ha-device-picker>
      <ha-device-condition-picker
        .value=${this.condition}
        .deviceId=${deviceId}
        @value-changed=${this._deviceConditionPicked}
        .hass=${this.hass}
        label="Condition"
      ></ha-device-condition-picker>
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
    if (this.condition) {
      this._origCondition = this.condition;
    }
  }

  protected updated(changedPros) {
    const prevCondition = changedPros.get("condition");
    if (
      prevCondition &&
      !deviceAutomationsEqual(prevCondition, this.condition)
    ) {
      this._getCapabilities();
    }
  }

  private async _getCapabilities() {
    const condition = this.condition;

    this._capabilities = condition.domain
      ? await fetchDeviceConditionCapabilities(this.hass, condition)
      : null;
  }

  private _devicePicked(ev) {
    ev.stopPropagation();
    this._deviceId = ev.target.value;
  }

  private _deviceConditionPicked(ev) {
    ev.stopPropagation();
    let condition = ev.detail.value;
    if (
      this._origCondition &&
      deviceAutomationsEqual(this._origCondition, condition)
    ) {
      condition = this._origCondition;
    }
    fireEvent(this, "value-changed", { value: condition });
  }

  private _extraFieldsChanged(ev) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: {
        ...this.condition,
        ...ev.detail.value,
      },
    });
  }

  private _extraFieldsComputeLabelCallback(localize) {
    // Returns a callback for ha-form to calculate labels per schema object
    return (schema) =>
      localize(
        `ui.panel.config.automation.editor.conditions.type.device.extra_fields.${schema.name}`
      ) || schema.name;
  }
}
