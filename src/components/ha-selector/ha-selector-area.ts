import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { DeviceRegistryEntry } from "../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../data/entity_registry";
import {
  EntitySources,
  fetchEntitySourcesWithCache,
} from "../../data/entity_sources";
import { AreaSelector } from "../../data/selector";
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

  @state() private _entitySources?: EntitySources;

  @state() private _entities?: EntityRegistryEntry[];

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._entities = entities.filter((entity) => entity.device_id !== null);
      }),
    ];
  }

  protected updated(changedProperties) {
    if (
      changedProperties.has("selector") &&
      (this.selector.area.device?.integration ||
        this.selector.area.entity?.integration) &&
      !this._entitySources
    ) {
      fetchEntitySourcesWithCache(this.hass).then((sources) => {
        this._entitySources = sources;
      });
    }
  }

  protected render() {
    if (
      (this.selector.area.device?.integration ||
        this.selector.area.entity?.integration) &&
      !this._entitySources
    ) {
      return html``;
    }

    if (!this.selector.area.multiple) {
      return html`
        <ha-area-picker
          .hass=${this.hass}
          .value=${this.value}
          .label=${this.label}
          .helper=${this.helper}
          no-add
          .deviceFilter=${this._filterDevices}
          .entityFilter=${this._filterEntities}
          .includeDeviceClasses=${this.selector.area.entity?.device_class
            ? [this.selector.area.entity.device_class]
            : undefined}
          .includeDomains=${this.selector.area.entity?.domain
            ? [this.selector.area.entity.domain]
            : undefined}
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
        .includeDeviceClasses=${this.selector.area.entity?.device_class
          ? [this.selector.area.entity.device_class]
          : undefined}
        .includeDomains=${this.selector.area.entity?.domain
          ? [this.selector.area.entity.domain]
          : undefined}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-areas-picker>
    `;
  }

  private _filterEntities = (entity: EntityRegistryEntry): boolean => {
    const filterIntegration = this.selector.area.entity?.integration;
    if (
      filterIntegration &&
      this._entitySources?.[entity.entity_id]?.domain !== filterIntegration
    ) {
      return false;
    }
    return true;
  };

  private _filterDevices = (device: DeviceRegistryEntry): boolean => {
    if (!this.selector.area.device) {
      return true;
    }

    const {
      manufacturer: filterManufacturer,
      model: filterModel,
      integration: filterIntegration,
    } = this.selector.area.device;

    if (filterManufacturer && device.manufacturer !== filterManufacturer) {
      return false;
    }
    if (filterModel && device.model !== filterModel) {
      return false;
    }
    if (filterIntegration && this._entitySources && this._entities) {
      const deviceIntegrations = this._deviceIntegrations(
        this._entitySources,
        this._entities
      );
      if (!deviceIntegrations?.[device.id]?.includes(filterIntegration)) {
        return false;
      }
    }
    return true;
  };

  private _deviceIntegrations = memoizeOne(
    (entitySources: EntitySources, entities: EntityRegistryEntry[]) => {
      const deviceIntegrations: Record<string, string[]> = {};

      for (const entity of entities) {
        const source = entitySources[entity.entity_id];
        if (!source?.domain) {
          continue;
        }
        if (!deviceIntegrations[entity.device_id!]) {
          deviceIntegrations[entity.device_id!] = [];
        }
        deviceIntegrations[entity.device_id!].push(source.domain);
      }
      return deviceIntegrations;
    }
  );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-area": HaAreaSelector;
  }
}
