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
import type { AreaSelector } from "../../data/selector";
import {
  filterSelectorDevices,
  filterSelectorEntities,
} from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-area-picker";
import "../ha-areas-picker";

@customElement("ha-selector-area")
export class HaAreaSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: AreaSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @state() private _configEntries?: ConfigEntry[];

  private _fetchedConfigEntries = false;

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

  private _hasIntegration(selector: AreaSelector) {
    return (
      (selector.area?.entity &&
        ensureArray(selector.area.entity).some(
          (filter) => filter.integration
        )) ||
      (selector.area?.device &&
        ensureArray(selector.area.device).some((device) => device.integration))
    );
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.get("selector") && this.value !== undefined) {
      if (this.selector.area?.multiple && !Array.isArray(this.value)) {
        this.value = [this.value];
        fireEvent(this, "value-changed", { value: this.value });
      } else if (!this.selector.area?.multiple && Array.isArray(this.value)) {
        this.value = this.value[0];
        fireEvent(this, "value-changed", { value: this.value });
      }
    }
  }

  protected updated(): void {
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

    if (!this.selector.area?.multiple) {
      return html`
        <ha-area-picker
          .value=${this.value}
          .label=${this.label}
          .helper=${this.helper}
          no-add
          .deviceFilter=${
            this.selector.area?.device ? this._filterDevices : undefined
          }
          .entityFilter=${
            this.selector.area?.entity ? this._filterEntities : undefined
          }
          .disabled=${this.disabled}
          .required=${this.required}
        ></ha-area-picker>
      `;
    }

    return html`
      <ha-areas-picker
        .hass=${this.hass}
        .value=${this.value}
        .helper=${this.helper}
        .pickAreaLabel=${this.label}
        no-add
        .deviceFilter=${
          this.selector.area?.device ? this._filterDevices : undefined
        }
        .entityFilter=${
          this.selector.area?.entity ? this._filterEntities : undefined
        }
        .disabled=${this.disabled}
        .required=${this.required}
        .reorder=${this.selector.area?.reorder ?? false}
      ></ha-areas-picker>
    `;
  }

  private _filterEntities = (entity: HassEntity): boolean => {
    if (!this.selector.area?.entity) {
      return true;
    }

    return ensureArray(this.selector.area.entity).some((filter) =>
      filterSelectorEntities(
        filter,
        entity,
        undefined,
        this.hass.entities,
        this.hass.devices
      )
    );
  };

  private _filterDevices = (device: DeviceRegistryEntry): boolean => {
    if (!this.selector.area?.device) {
      return true;
    }

    const deviceIntegrations = this._hasIntegration(this.selector)
      ? this._deviceIntegrationLookup(
          this.hass.entities,
          this.hass.devices,
          this._configEntries
        )
      : undefined;

    return ensureArray(this.selector.area.device).some((filter) =>
      filterSelectorDevices(filter, device, deviceIntegrations)
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-area": HaAreaSelector;
  }
}
