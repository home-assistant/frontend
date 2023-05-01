import { consume } from "@lit-labs/context";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/device/ha-device-picker";
import "../../../../../components/device/ha-device-trigger-picker";
import "../../../../../components/ha-form/ha-form";
import { fullEntitiesContext } from "../../../../../data/context";
import {
  deviceAutomationsEqual,
  DeviceCapabilities,
  DeviceTrigger,
  fetchDeviceTriggerCapabilities,
} from "../../../../../data/device_automation";
import { EntityRegistryEntry } from "../../../../../data/entity_registry";
import { HomeAssistant } from "../../../../../types";

@customElement("ha-automation-trigger-device")
export class HaDeviceTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public trigger!: DeviceTrigger;

  @property({ type: Boolean }) public disabled = false;

  @state() private _deviceId?: string;

  @state() private _capabilities?: DeviceCapabilities;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  private _origTrigger?: DeviceTrigger;

  public static get defaultConfig() {
    return {
      device_id: "",
      domain: "",
      entity_id: "",
    };
  }

  private _extraFieldsData = memoizeOne(
    (trigger: DeviceTrigger, capabilities: DeviceCapabilities) => {
      const extraFieldsData: Record<string, any> = {};
      capabilities.extra_fields.forEach((item) => {
        if (trigger[item.name] !== undefined) {
          extraFieldsData![item.name] = trigger[item.name];
        }
      });
      return extraFieldsData;
    }
  );

  protected render() {
    const deviceId = this._deviceId || this.trigger.device_id;

    return html`
      <ha-device-picker
        .value=${deviceId}
        @value-changed=${this._devicePicked}
        .hass=${this.hass}
        .disabled=${this.disabled}
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.device.label"
        )}
      ></ha-device-picker>
      <ha-device-trigger-picker
        .value=${this.trigger}
        .deviceId=${deviceId}
        @value-changed=${this._deviceTriggerPicked}
        .hass=${this.hass}
        .disabled=${this.disabled}
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.device.trigger"
        )}
      ></ha-device-trigger-picker>
      ${this._capabilities?.extra_fields
        ? html`
            <ha-form
              .hass=${this.hass}
              .data=${this._extraFieldsData(this.trigger, this._capabilities)}
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
    if (this.trigger) {
      this._origTrigger = this.trigger;
    }
  }

  protected updated(changedProps) {
    if (!changedProps.has("trigger")) {
      return;
    }
    const prevTrigger = changedProps.get("trigger");
    if (
      prevTrigger &&
      !deviceAutomationsEqual(this._entityReg, prevTrigger, this.trigger)
    ) {
      this._getCapabilities();
    }
  }

  private async _getCapabilities() {
    const trigger = this.trigger;

    this._capabilities = trigger.domain
      ? await fetchDeviceTriggerCapabilities(this.hass, trigger)
      : undefined;
  }

  private _devicePicked(ev) {
    ev.stopPropagation();
    this._deviceId = ev.target.value;
    if (this._deviceId === undefined) {
      fireEvent(this, "value-changed", {
        value: { ...HaDeviceTrigger.defaultConfig, platform: "device" },
      });
    }
  }

  private _deviceTriggerPicked(ev) {
    ev.stopPropagation();
    let trigger = ev.detail.value;
    if (
      this._origTrigger &&
      deviceAutomationsEqual(this._entityReg, this._origTrigger, trigger)
    ) {
      trigger = this._origTrigger;
    }
    if (this.trigger.id) {
      trigger.id = this.trigger.id;
    }
    fireEvent(this, "value-changed", { value: trigger });
  }

  private _extraFieldsChanged(ev: CustomEvent) {
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
    "ha-automation-trigger-device": HaDeviceTrigger;
  }
}
