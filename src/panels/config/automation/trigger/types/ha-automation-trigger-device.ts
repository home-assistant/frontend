import { consume } from "@lit/context";
import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { deepEqual } from "../../../../../common/util/deep-equal";
import "../../../../../components/device/ha-device-picker";
import "../../../../../components/device/ha-device-trigger-picker";
import { computeInitialHaFormData } from "../../../../../components/ha-form/compute-initial-ha-form-data";
import "../../../../../components/ha-form/ha-form";
import { fullEntitiesContext } from "../../../../../data/context";
import type {
  DeviceCapabilities,
  DeviceTrigger,
} from "../../../../../data/device/device_automation";
import {
  deviceAutomationEditorMode,
  fetchReplacementDevices,
  fetchDeviceTriggers,
  deviceAutomationsEqual,
  fetchDeviceTriggerCapabilities,
  localizeExtraFieldsComputeHelperCallback,
  localizeExtraFieldsComputeLabelCallback,
} from "../../../../../data/device/device_automation";
import {
  fetchDeviceCompositeSplits,
  type DeviceCompositeSplits,
} from "../../../../../data/device/device_registry";
import type { EntityRegistryEntry } from "../../../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../../../types";

@customElement("ha-automation-trigger-device")
export class HaDeviceTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public trigger!: DeviceTrigger;

  @property({ type: Boolean }) public disabled = false;

  @state() private _deviceId?: string;

  @state() private _capabilities?: DeviceCapabilities;

  @state() private _compositeSplits?: DeviceCompositeSplits;

  @state() private _replacementDeviceIds?: string[];

  private _loadingCompositeSplits = false;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg: EntityRegistryEntry[] = [];

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

  public shouldUpdate(_changedProperties: PropertyValues<this>) {
    const mode = deviceAutomationEditorMode(
      this.hass,
      this.trigger.device_id,
      this._compositeSplits
    );
    if (mode === "loading") {
      // The device is missing; wait for the composite split map before deciding
      // whether it is a replaced device (editable) or genuinely unknown (YAML).
      this._loadCompositeSplits();
      return false;
    }
    if (mode === "unknown-device") {
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

  private async _loadCompositeSplits() {
    if (this._loadingCompositeSplits) {
      return;
    }
    this._loadingCompositeSplits = true;
    try {
      // Resolve the candidates before exposing the split map, so the picker
      // never offers one that cannot host the automation.
      const compositeSplits = await fetchDeviceCompositeSplits(this.hass);
      this._replacementDeviceIds = await fetchReplacementDevices(
        this.hass,
        this._entityReg,
        this.trigger,
        compositeSplits,
        fetchDeviceTriggers
      );
      this._compositeSplits = compositeSplits;
    } catch (_err) {
      this._compositeSplits = {};
    } finally {
      this._loadingCompositeSplits = false;
    }
  }

  protected render() {
    const deviceId = this._deviceId || this.trigger.device_id;

    return html`
      <ha-device-picker
        .value=${deviceId}
        .replacementDeviceIds=${this._replacementDeviceIds}
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
      ${
        this._capabilities?.extra_fields
          ? html`
              <ha-form
                .hass=${this.hass}
                .data=${this._extraFieldsData(this.trigger, this._capabilities)}
                .schema=${this._capabilities.extra_fields}
                .disabled=${this.disabled}
                .computeLabel=${localizeExtraFieldsComputeLabelCallback(
                  this.hass.localize,
                  this.trigger
                )}
                .computeHelper=${localizeExtraFieldsComputeHelperCallback(
                  this.hass.localize,
                  this.trigger
                )}
                @value-changed=${this._extraFieldsChanged}
              ></ha-form>
            `
          : ""
      }
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

  protected updated(changedProps: PropertyValues<this>) {
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
      ? await fetchDeviceTriggerCapabilities(this.hass.callWS, trigger)
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
    // The automation exists as is on the replacement, so only the reference
    // changes and the rest of the configuration is left untouched.
    if (this._replacementDeviceIds?.includes(ev.target.value)) {
      this._deviceId = undefined;
      fireEvent(this, "value-changed", {
        value: { ...this.trigger, device_id: ev.target.value },
      });
      return;
    }
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
    :host {
      display: block;
      margin-bottom: var(--ha-space-3);
    }
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
