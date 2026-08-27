import { consume } from "@lit/context";
import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/device/ha-device-condition-picker";
import "../../../../../components/device/ha-device-picker";
import "../../../../../components/ha-form/ha-form";
import { fullEntitiesContext } from "../../../../../data/context";
import type {
  DeviceCapabilities,
  DeviceCondition,
} from "../../../../../data/device/device_automation";
import {
  deviceAutomationEditorMode,
  fetchReplacementDevices,
  fetchDeviceConditions,
  deviceAutomationsEqual,
  fetchDeviceConditionCapabilities,
  localizeExtraFieldsComputeHelperCallback,
  localizeExtraFieldsComputeLabelCallback,
} from "../../../../../data/device/device_automation";
import {
  fetchDeviceCompositeSplits,
  type DeviceCompositeSplits,
} from "../../../../../data/device/device_registry";
import type { EntityRegistryEntry } from "../../../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../../../types";

@customElement("ha-automation-condition-device")
export class HaDeviceCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public condition!: DeviceCondition;

  @property({ type: Boolean }) public disabled = false;

  @state() private _deviceId?: string;

  @state() private _capabilities?: DeviceCapabilities;

  @state() private _compositeSplits?: DeviceCompositeSplits;

  @state() private _replacementDeviceIds?: string[];

  private _loadingCompositeSplits = false;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg: EntityRegistryEntry[] = [];

  private _origCondition?: DeviceCondition;

  public static get defaultConfig(): DeviceCondition {
    return {
      condition: "device",
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

  public shouldUpdate(_changedProperties: PropertyValues<this>) {
    const mode = deviceAutomationEditorMode(
      this.hass,
      this.condition.device_id,
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
        this.condition,
        compositeSplits,
        fetchDeviceConditions
      );
      this._compositeSplits = compositeSplits;
    } catch (_err) {
      this._compositeSplits = {};
    } finally {
      this._loadingCompositeSplits = false;
    }
  }

  protected render() {
    const deviceId = this._deviceId || this.condition.device_id;

    return html`
      <ha-device-picker
        .value=${deviceId}
        .replacementDeviceIds=${this._replacementDeviceIds}
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
      ${
        this._capabilities?.extra_fields
          ? html`
              <ha-form
                .hass=${this.hass}
                .data=${this._extraFieldsData(this.condition, this._capabilities)}
                .schema=${this._capabilities.extra_fields}
                .disabled=${this.disabled}
                .computeLabel=${localizeExtraFieldsComputeLabelCallback(
                  this.hass.localize,
                  this.condition
                )}
                .computeHelper=${localizeExtraFieldsComputeHelperCallback(
                  this.hass.localize,
                  this.condition
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
    if (this.condition) {
      this._origCondition = this.condition;
    }
  }

  protected updated(changedProps: PropertyValues<this>) {
    const prevCondition = changedProps.get("condition");
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
      ? await fetchDeviceConditionCapabilities(this.hass.callWS, condition)
      : undefined;
  }

  private _devicePicked(ev) {
    ev.stopPropagation();
    // The automation exists as is on the replacement, so only the reference
    // changes and the rest of the configuration is left untouched.
    if (this._replacementDeviceIds?.includes(ev.target.value)) {
      this._deviceId = undefined;
      fireEvent(this, "value-changed", {
        value: { ...this.condition, device_id: ev.target.value },
      });
      return;
    }
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
    "ha-automation-condition-device": HaDeviceCondition;
  }
}
