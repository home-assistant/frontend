import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import type { ConfigEntry } from "../../data/config_entries";
import { getConfigEntries } from "../../data/config_entries";
import type { DeviceRegistryEntry } from "../../data/device/device_registry";
import { getDeviceIntegrationLookup } from "../../data/device/device_registry";
import type { DeviceSelector } from "../../data/selector";
import {
  filterSelectorDevices,
  filterSelectorEntities,
} from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../device/ha-device-picker";
import "../device/ha-devices-picker";

@customElement("ha-selector-device")
export class HaDeviceSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: DeviceSelector;

  @state() private _configEntries?: ConfigEntry[];

  private _fetchedConfigEntries = false;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  private _deviceIntegrationLookup = memoizeOne(
    (
      entities: HomeAssistant["entities"],
      devices: HomeAssistant["devices"],
      configEntries?: ConfigEntry[]
    ) =>
      getDeviceIntegrationLookup(
        Object.values(entities),
        Object.values(devices),
        configEntries
      )
  );

  private _hasIntegration(selector: DeviceSelector) {
    return (
      (selector.device?.filter &&
        ensureArray(selector.device.filter).some(
          (filter) => filter.integration
        )) ||
      (selector.device?.entity &&
        ensureArray(selector.device.entity).some(
          (device) => device.integration
        ))
    );
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.get("selector") && this.value !== undefined) {
      if (this.selector.device?.multiple && !Array.isArray(this.value)) {
        this.value = [this.value];
        fireEvent(this, "value-changed", { value: this.value });
      } else if (!this.selector.device?.multiple && Array.isArray(this.value)) {
        this.value = this.value[0];
        fireEvent(this, "value-changed", { value: this.value });
      }
    }
  }

  protected updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    if (!this._fetchedConfigEntries && this._hasIntegration(this.selector)) {
      this._fetchedConfigEntries = true;
      getConfigEntries(this.hass)
        .then((entries) => {
          this._configEntries = entries;
        })
        .catch(() => {
          this._configEntries = [];
        });
    }
  }

  protected render() {
    if (this._hasIntegration(this.selector) && !this._configEntries) {
      return nothing;
    }

    if (!this.selector.device?.multiple) {
      return html`
        <ha-device-picker
          .hass=${this.hass}
          .value=${this.value}
          .label=${this.label}
          .helper=${this.helper}
          .deviceFilter=${this._filterDevices}
          .entityFilter=${
            this.selector.device?.entity ? this._filterEntities : undefined
          }
          .placeholder=${this.placeholder}
          .disabled=${this.disabled}
          .required=${this.required}
        ></ha-device-picker>
      `;
    }

    return html`
      ${this.label ? html`<label>${this.label}</label>` : ""}
      <ha-devices-picker
        .hass=${this.hass}
        .value=${this.value}
        .helper=${this.helper}
        .deviceFilter=${this._filterDevices}
        .entityFilter=${
          this.selector.device?.entity ? this._filterEntities : undefined
        }
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-devices-picker>
    `;
  }

  private _filterDevices = (device: DeviceRegistryEntry): boolean => {
    if (!this.selector.device?.filter) {
      return true;
    }
    const deviceIntegrations = this._hasIntegration(this.selector)
      ? this._deviceIntegrationLookup(
          this.hass.entities,
          this.hass.devices,
          this._configEntries
        )
      : undefined;

    return ensureArray(this.selector.device.filter).some((filter) =>
      filterSelectorDevices(filter, device, deviceIntegrations)
    );
  };

  private _filterEntities = (entity: HassEntity): boolean =>
    ensureArray(this.selector.device!.entity).some((filter) =>
      filterSelectorEntities(
        filter,
        entity,
        undefined,
        this.hass.entities,
        this.hass.devices
      )
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-device": HaDeviceSelector;
  }
}
