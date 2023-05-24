import { consume } from "@lit-labs/context";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/device/ha-device-condition-picker";
import "../../../../../components/device/ha-device-picker";
import "../../../../../components/ha-form/ha-form";
import { fullEntitiesContext } from "../../../../../data/context";
import {
  deviceAutomationsEqual,
  DeviceCapabilities,
  DeviceCondition,
  fetchDeviceConditionCapabilities,
} from "../../../../../data/device_automation";
import { EntityRegistryEntry } from "../../../../../data/entity_registry";
import type { HomeAssistant } from "../../../../../types";

@customElement("ha-automation-condition-device")
export class HaDeviceCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public condition!: DeviceCondition;

  @property({ type: Boolean }) public disabled = false;

  @state() private _deviceId?: string;

  @state() private _capabilities?: DeviceCapabilities;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  private _origCondition?: DeviceCondition;

  public static get defaultConfig() {
    return {
      device_id: "",
      domain: "",
      entity_id: "",
    };
  }

  private _extraFieldsData = memoizeOne(
    (condition: DeviceCondition, capabilities: DeviceCapabilities) => {
      const extraFieldsData: Record<string, any> = {};
      capabilities.extra_fields.forEach((item) => {
        if (condition[item.name] !== undefined) {
          extraFieldsData![item.name] = condition[item.name];
        }
      });
      return extraFieldsData;
    }
  );

  protected render() {
    const deviceId = this._deviceId || this.condition.device_id;

    return html`
      <ha-device-picker
        .value=${deviceId}
        @value-changed=${this._devicePicked}
        .hass=${this.hass}
        .disabled=${this.disabled}
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.device.label"
        )}
      ></ha-device-picker>
      <ha-device-condition-picker
        .value=${this.condition}
        .deviceId=${deviceId}
        @value-changed=${this._deviceConditionPicked}
        .hass=${this.hass}
        .disabled=${this.disabled}
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.device.condition"
        )}
      ></ha-device-condition-picker>
      ${this._capabilities?.extra_fields
        ? html`
            <ha-form
              .hass=${this.hass}
              .data=${this._extraFieldsData(this.condition, this._capabilities)}
              .schema=${this._capabilities.extra_fields}
              .disabled=${this.disabled}
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
      !deviceAutomationsEqual(this._entityReg, prevCondition, this.condition)
    ) {
      this._getCapabilities();
    }
  }

  private async _getCapabilities() {
    const condition = this.condition;

    this._capabilities = condition.domain
      ? await fetchDeviceConditionCapabilities(this.hass, condition)
      : undefined;
  }

  private _devicePicked(ev) {
    ev.stopPropagation();
    this._deviceId = ev.target.value;
    if (this._deviceId === undefined) {
      fireEvent(this, "value-changed", {
        value: { ...HaDeviceCondition.defaultConfig, condition: "device" },
      });
    }
  }

  private _deviceConditionPicked(ev) {
    ev.stopPropagation();
    let condition = ev.detail.value;
    if (
      this._origCondition &&
      deviceAutomationsEqual(this._entityReg, this._origCondition, condition)
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

  static styles = css`
    ha-device-picker {
      display: block;
      margin-bottom: 24px;
    }

    ha-form {
      margin-top: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-device": HaDeviceCondition;
  }
}
