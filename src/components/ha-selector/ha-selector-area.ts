import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, PropertyValues, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import type { DeviceRegistryEntry } from "../../data/device_registry";
import { getDeviceIntegrationLookup } from "../../data/device_registry";
import { fireEvent } from "../../common/dom/fire_event";
import {
  EntitySources,
  fetchEntitySourcesWithCache,
} from "../../data/entity_sources";
import type { AreaSelector } from "../../data/selector";
import {
  filterSelectorDevices,
  filterSelectorEntities,
} from "../../data/selector";
import { HomeAssistant } from "../../types";
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

  @state() private _entitySources?: EntitySources;

  private _deviceIntegrationLookup = memoizeOne(getDeviceIntegrationLookup);

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

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("selector") && this.value !== undefined) {
      if (this.selector.area?.multiple && !Array.isArray(this.value)) {
        this.value = [this.value];
        fireEvent(this, "value-changed", { value: this.value });
      } else if (!this.selector.area?.multiple && Array.isArray(this.value)) {
        this.value = this.value[0];
        fireEvent(this, "value-changed", { value: this.value });
      }
    }
  }

  protected updated(changedProperties: PropertyValues): void {
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

    if (!this.selector.area?.multiple) {
      return html`
        <ha-area-picker
          .hass=${this.hass}
          .value=${this.value}
          .label=${this.label}
          .helper=${this.helper}
          no-add
          .deviceFilter=${this._filterDevices}
          .entityFilter=${this._filterEntities}
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
        .deviceFilter=${this._filterDevices}
        .entityFilter=${this._filterEntities}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-areas-picker>
    `;
  }

  private _filterEntities = (entity: HassEntity): boolean => {
    if (!this.selector.area?.entity) {
      return true;
    }

    return ensureArray(this.selector.area.entity).some((filter) =>
      filterSelectorEntities(filter, entity, this._entitySources)
    );
  };

  private _filterDevices = (device: DeviceRegistryEntry): boolean => {
    if (!this.selector.area?.device) {
      return true;
    }

    const deviceIntegrations = this._entitySources
      ? this._deviceIntegrationLookup(
          this._entitySources,
          Object.values(this.hass.entities)
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
