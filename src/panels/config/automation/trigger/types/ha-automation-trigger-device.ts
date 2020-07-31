import {
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
} from "lit-element";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/device/ha-device-picker";
import "../../../../../components/device/ha-device-trigger-picker";
import "../../../../../components/ha-form/ha-form";
import {
  deviceAutomationsEqual,
  DeviceTrigger,
  fetchDeviceTriggerCapabilities,
} from "../../../../../data/device_automation";
import { HomeAssistant } from "../../../../../types";
import memoizeOne from "memoize-one";

@customElement("ha-automation-trigger-device")
export class HaDeviceTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: DeviceTrigger;

  @internalProperty() private _deviceId?: string;

  @internalProperty() private _capabilities?;

  private _origTrigger?: DeviceTrigger;

  public static get defaultConfig() {
    return {
      device_id: "",
      domain: "",
      entity_id: "",
    };
  }

  private _extraFieldsData = memoizeOne(
    (capabilities, trigger: DeviceTrigger) => {
      let extraFieldsData: { [key: string]: any } | undefined;
      if (capabilities && capabilities.extra_fields) {
        extraFieldsData = {};
        this._capabilities.extra_fields.forEach((item) => {
          if (trigger[item.name] !== undefined) {
            extraFieldsData![item.name] = trigger[item.name];
          }
        });
      }
      return extraFieldsData;
    }
  );

  protected render() {
    const deviceId = this._deviceId || this.trigger.device_id;

    const extraFieldsData = this._extraFieldsData(
      this._capabilities,
      this.trigger
    );

    return html`
      <ha-device-picker
        .value=${deviceId}
        @value-changed=${this._devicePicked}
        .hass=${this.hass}
        label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.device.label"
        )}
      ></ha-device-picker>
      <ha-device-trigger-picker
        .value=${this.trigger}
        .deviceId=${deviceId}
        @value-changed=${this._deviceTriggerPicked}
        .hass=${this.hass}
        label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.device.trigger"
        )}
      ></ha-device-trigger-picker>
      ${extraFieldsData
        ? html`
            <ha-form
              .data=${extraFieldsData}
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

  private _extraFieldsChanged(ev: CustomEvent) {
    console.log("extra", ev.detail.value);
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
