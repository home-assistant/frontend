import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import type { DeviceRegistryEntry } from "../../data/device_registry";
import { getDeviceIntegrationLookup } from "../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../data/entity_registry";
import {
  EntitySources,
  fetchEntitySourcesWithCache,
} from "../../data/entity_sources";
import type { AreaSelector } from "../../data/selector";
import {
  filterSelectorDevices,
  filterSelectorEntities,
} from "../../data/selector";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../types";
import "../ha-area-picker";
import "../ha-areas-picker";

@customElement("ha-selector-area")
export class HaAreaSelector extends SubscribeMixin(LitElement) {
  @property() public hass!: HomeAssistant;

  @property() public selector!: AreaSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @state() private _entitySources?: EntitySources;

  @state() private _entities?: EntityRegistryEntry[];

  private _deviceIntegrationLookup = memoizeOne(getDeviceIntegrationLookup);

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._entities = entities.filter((entity) => entity.device_id !== null);
      }),
    ];
  }

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

  protected render(): TemplateResult {
    if (this._hasIntegration(this.selector) && !this._entitySources) {
      return html``;
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

    const deviceIntegrations =
      this._entitySources && this._entities
        ? this._deviceIntegrationLookup(this._entitySources, this._entities)
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
