import { consume } from "@lit/context";
import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { deepEqual } from "../../../../../common/util/deep-equal";
import "../../../../../components/device/ha-device-picker";
import "../../../../../components/device/ha-device-trigger-picker";
import "../../../../../components/ha-form/ha-form";
import { computeInitialHaFormData } from "../../../../../components/ha-form/compute-initial-ha-form-data";
import { fullEntitiesContext } from "../../../../../data/context";
import type {
  DeviceCapabilities,
  DeviceTrigger,
} from "../../../../../data/device_automation";
import {
  deviceAutomationsEqual,
  fetchDeviceTriggerCapabilities,
  localizeExtraFieldsComputeLabelCallback,
  localizeExtraFieldsComputeHelperCallback,
} from "../../../../../data/device_automation";
import type { EntityRegistryEntry } from "../../../../../data/entity_registry";
import type { HomeAssistant } from "../../../../../types";

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

  public static get defaultConfig(): DeviceTrigger {
    return {
      trigger: "device",
      device_id: "",
      domain: "",
      entity_id: "",
    };
  }

  private _extraFieldsData = memoizeOne(
    (trigger: DeviceTrigger, capabilities: DeviceCapabilities) => {
      const extraFieldsData = computeInitialHaFormData(
        capabilities.extra_fields
      );
      capabilities.extra_fields.forEach((item) => {
        if (trigger[item.name] !== undefined) {
          extraFieldsData![item.name] = trigger[item.name];
        }
      });
      return extraFieldsData;
    }
  );

  public shouldUpdate(changedProperties: PropertyValues) {
    if (!changedProperties.has("trigger")) {
      return true;
    }
    if (
      this.trigger.device_id &&
      !(this.trigger.device_id in this.hass.devices)
    ) {
      fireEvent(
        this,
        "ui-mode-not-available",
        Error(
          this.hass.localize(
            "ui.panel.config.automation.editor.edit_unknown_device"
          )
        )
      );
      return false;
    }
    return true;
  }

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
              .computeLabel=${localizeExtraFieldsComputeLabelCallback(
                this.hass,
                this.trigger
              )}
              .computeHelper=${localizeExtraFieldsComputeHelperCallback(
                this.hass,
                this.trigger
              )}
              @value-changed=${this._extraFieldsChanged}
            ></ha-form>
          `
        : ""}
    `;
  }

  protected firstUpdated() {
    this.hass.loadBackendTranslation("device_automation");
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

    if (this._capabilities) {
      // Match yaml to what is displayed in the form from computeInitialHaFormData
      const newTrigger = {
        ...this.trigger,
        ...this._extraFieldsData(this.trigger, this._capabilities),
      };

      if (!deepEqual(this.trigger, newTrigger)) {
        fireEvent(this, "value-changed", {
          value: newTrigger,
        });
      }
    }
  }

  private _devicePicked(ev) {
    ev.stopPropagation();
    this._deviceId = ev.target.value;
    if (this._deviceId === undefined) {
      fireEvent(this, "value-changed", {
        value: { ...HaDeviceTrigger.defaultConfig, trigger: "device" },
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

  static styles = css`
    ha-device-picker {
      display: block;
      margin-bottom: 24px;
    }

    ha-form {
      display: block;
      margin-top: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-device": HaDeviceTrigger;
  }
}
