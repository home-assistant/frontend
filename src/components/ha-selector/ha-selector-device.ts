import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import type { DeviceRegistryEntry } from "../../data/device_registry";
import { getDeviceIntegrationLookup } from "../../data/device_registry";
import {
  EntitySources,
  fetchEntitySourcesWithCache,
} from "../../data/entity_sources";
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
  @property() public hass!: HomeAssistant;

  @property() public selector!: DeviceSelector;

  @state() private _entitySources?: EntitySources;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  private _deviceIntegrationLookup = memoizeOne(getDeviceIntegrationLookup);

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

  protected updated(changedProperties): void {
    super.updated(changedProperties);
    if (
      changedProperties.has("selector") &&
      this._hasIntegration(this.selector) &&
      !this._entitySources
    ) {
      fetchEntitySourcesWithCache(this.hass).then((sources) => {
        this._entitySources = sources;
      });
    }
  }

  protected render() {
    if (this._hasIntegration(this.selector) && !this._entitySources) {
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
          .entityFilter=${this.selector.device?.entity
            ? this._filterEntities
            : undefined}
          .disabled=${this.disabled}
          .required=${this.required}
          allow-custom-entity
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
        .entityFilter=${this.selector.device?.entity
          ? this._filterEntities
          : undefined}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-devices-picker>
    `;
  }

  private _filterDevices = (device: DeviceRegistryEntry): boolean => {
    if (!this.selector.device?.filter) {
      return true;
    }
    const deviceIntegrations = this._entitySources
      ? this._deviceIntegrationLookup(
          this._entitySources,
          Object.values(this.hass.entities)
        )
      : undefined;

    return ensureArray(this.selector.device.filter).some((filter) =>
      filterSelectorDevices(filter, device, deviceIntegrations)
    );
  };

  private _filterEntities = (entity: HassEntity): boolean =>
    ensureArray(this.selector.device!.entity).some((filter) =>
      filterSelectorEntities(filter, entity, this._entitySources)
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-device": HaDeviceSelector;
  }
}
