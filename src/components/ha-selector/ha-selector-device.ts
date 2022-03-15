import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ConfigEntry, getConfigEntries } from "../../data/config_entries";
import type { DeviceRegistryEntry } from "../../data/device_registry";
import type { DeviceSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../device/ha-device-picker";
import "../device/ha-devices-picker";

@customElement("ha-selector-device")
export class HaDeviceSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: DeviceSelector;

  @property() public value?: any;

  @property() public label?: string;

  @state() public _configEntries?: ConfigEntry[];

  @property({ type: Boolean }) public disabled = false;

  protected updated(changedProperties) {
    if (changedProperties.has("selector")) {
      const oldSelector = changedProperties.get("selector");
      if (oldSelector !== this.selector && this.selector.device?.integration) {
        this._loadConfigEntries();
      }
    }
  }

  protected render() {
    if (!this.selector.device.multiple) {
      return html`<ha-device-picker
        .hass=${this.hass}
        .value=${this.value}
        .label=${this.label}
        .deviceFilter=${this._filterDevices}
        .includeDeviceClasses=${this.selector.device.entity?.device_class
          ? [this.selector.device.entity.device_class]
          : undefined}
        .includeDomains=${this.selector.device.entity?.domain
          ? [this.selector.device.entity.domain]
          : undefined}
        .disabled=${this.disabled}
        allow-custom-entity
      ></ha-device-picker> `;
    }

    return html`
      ${this.label ? html`<label>${this.label}</label>` : ""}
      <ha-devices-picker
        .hass=${this.hass}
        .value=${this.value}
        .entityFilter=${this._filterDevices}
      ></ha-devices-picker>
    `;
  }

  private _filterDevices = (device: DeviceRegistryEntry): boolean => {
    if (
      this.selector.device?.manufacturer &&
      device.manufacturer !== this.selector.device.manufacturer
    ) {
      return false;
    }
    if (
      this.selector.device?.model &&
      device.model !== this.selector.device.model
    ) {
      return false;
    }
    if (this.selector.device?.integration) {
      if (
        this._configEntries &&
        !this._configEntries.some((entry) =>
          device.config_entries.includes(entry.entry_id)
        )
      ) {
        return false;
      }
    }
    return true;
  };

  private async _loadConfigEntries() {
    this._configEntries = (await getConfigEntries(this.hass)).filter(
      (entry) => entry.domain === this.selector.device.integration
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-device": HaDeviceSelector;
  }
}
