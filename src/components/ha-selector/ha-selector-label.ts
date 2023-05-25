import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, PropertyValues, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import type { DeviceRegistryEntry } from "../../data/device_registry";
import { getDeviceIntegrationLookup } from "../../data/device_registry";
import {
  EntitySources,
  fetchEntitySourcesWithCache,
} from "../../data/entity_sources";
import type { LabelSelector } from "../../data/selector";
import {
  filterSelectorDevices,
  filterSelectorEntities,
} from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-label-picker";
import "../ha-labels-picker";

@customElement("ha-selector-label")
export class HaLabelSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: LabelSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @state() private _entitySources?: EntitySources;

  private _deviceIntegrationLookup = memoizeOne(getDeviceIntegrationLookup);

  private _hasIntegration(selector: LabelSelector) {
    return (
      (selector.label?.entity &&
        ensureArray(selector.label.entity).some(
          (filter) => filter.integration
        )) ||
      (selector.label?.device &&
        ensureArray(selector.label.device).some((device) => device.integration))
    );
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

    if (!this.selector.label?.multiple) {
      return html`
        <ha-label-picker
          .hass=${this.hass}
          .value=${this.value}
          .label=${this.label}
          .helper=${this.helper}
          no-add
          .deviceFilter=${this._filterDevices}
          .entityFilter=${this._filterEntities}
          .disabled=${this.disabled}
          .required=${this.required}
        ></ha-label-picker>
      `;
    }

    return html`
      <ha-labels-picker
        .hass=${this.hass}
        .value=${this.value}
        .helper=${this.helper}
        .pickLabelLabel=${this.label}
        no-add
        .deviceFilter=${this._filterDevices}
        .entityFilter=${this._filterEntities}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-labels-picker>
    `;
  }

  private _filterEntities = (entity: HassEntity): boolean => {
    if (!this.selector.label?.entity) {
      return true;
    }

    return ensureArray(this.selector.label.entity).some((filter) =>
      filterSelectorEntities(filter, entity, this._entitySources)
    );
  };

  private _filterDevices = (device: DeviceRegistryEntry): boolean => {
    if (!this.selector.label?.device) {
      return true;
    }

    const deviceIntegrations = this._entitySources
      ? this._deviceIntegrationLookup(
          this._entitySources,
          Object.values(this.hass.entities)
        )
      : undefined;

    return ensureArray(this.selector.label.device).some((filter) =>
      filterSelectorDevices(filter, device, deviceIntegrations)
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-label": HaLabelSelector;
  }
}
