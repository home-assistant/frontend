import { consume } from "@lit-labs/context";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/device/ha-device-action-picker";
import "../../../../../components/device/ha-device-picker";
import "../../../../../components/ha-form/ha-form";
import { fullEntitiesContext } from "../../../../../data/context";
import {
  DeviceAction,
  deviceAutomationsEqual,
  DeviceCapabilities,
  fetchDeviceActionCapabilities,
} from "../../../../../data/device_automation";
import { EntityRegistryEntry } from "../../../../../data/entity_registry";
import { HomeAssistant } from "../../../../../types";

@customElement("ha-automation-action-device_id")
export class HaDeviceAction extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Object }) public action!: DeviceAction;

  @state() private _deviceId?: string;

  @state() private _capabilities?: DeviceCapabilities;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  private _origAction?: DeviceAction;

  public static get defaultConfig() {
    return {
      device_id: "",
      domain: "",
      entity_id: "",
    };
  }

  private _extraFieldsData = memoizeOne(
    (action: DeviceAction, capabilities: DeviceCapabilities) => {
      const extraFieldsData: Record<string, any> = {};
      capabilities.extra_fields.forEach((item) => {
        if (action[item.name] !== undefined) {
          extraFieldsData![item.name] = action[item.name];
        }
      });
      return extraFieldsData;
    }
  );

  protected render() {
    const deviceId = this._deviceId || this.action.device_id;

    return html`
      <ha-device-picker
        .value=${deviceId}
        .disabled=${this.disabled}
        @value-changed=${this._devicePicked}
        .hass=${this.hass}
        label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.device_id.label"
        )}
      ></ha-device-picker>
      <ha-device-action-picker
        .value=${this.action}
        .deviceId=${deviceId}
        .disabled=${this.disabled}
        @value-changed=${this._deviceActionPicked}
        .hass=${this.hass}
        label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.device_id.action"
        )}
      ></ha-device-action-picker>
      ${this._capabilities?.extra_fields?.length
        ? html`
            <ha-form
              .hass=${this.hass}
              .data=${this._extraFieldsData(this.action, this._capabilities)}
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
    if (this.action) {
      this._origAction = this.action;
    }
  }

  protected updated(changedPros) {
    const prevAction = changedPros.get("action");
    if (
      prevAction &&
      !deviceAutomationsEqual(this._entityReg, prevAction, this.action)
    ) {
      this._deviceId = undefined;
      this._getCapabilities();
    }
  }

  private async _getCapabilities() {
    this._capabilities = this.action.domain
      ? await fetchDeviceActionCapabilities(this.hass, this.action)
      : undefined;
  }

  private _devicePicked(ev) {
    ev.stopPropagation();
    this._deviceId = ev.target.value;
    if (this._deviceId === undefined) {
      fireEvent(this, "value-changed", {
        value: HaDeviceAction.defaultConfig,
      });
    }
  }

  private _deviceActionPicked(ev) {
    ev.stopPropagation();
    let action = ev.detail.value;
    if (
      this._origAction &&
      deviceAutomationsEqual(this._entityReg, this._origAction, action)
    ) {
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
        `ui.panel.config.automation.editor.actions.type.device_id.extra_fields.${schema.name}`
      ) || schema.name;
  }

  static styles = css`
    ha-device-picker {
      display: block;
      margin-bottom: 24px;
    }

    ha-device-action-picker {
      display: block;
    }

    ha-form {
      display: block;
      margin-top: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-device_id": HaDeviceAction;
  }
}
