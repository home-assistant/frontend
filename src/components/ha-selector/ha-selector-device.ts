import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ConfigEntry } from "../../data/config_entries";
import type { DeviceRegistryEntry } from "../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../data/entity_registry";
import {
  EntitySources,
  fetchEntitySourcesWithCache,
} from "../../data/entity_sources";
import type { DeviceSelector } from "../../data/selector";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../types";
import "../device/ha-device-picker";
import "../device/ha-devices-picker";

@customElement("ha-selector-device")
export class HaDeviceSelector extends SubscribeMixin(LitElement) {
  @property() public hass!: HomeAssistant;

  @property() public selector!: DeviceSelector;

  @state() private _entitySources?: EntitySources;

  @state() private _entities?: EntityRegistryEntry[];

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @state() public _configEntries?: ConfigEntry[];

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._entities = entities.filter((entity) => entity.device_id !== null);
      }),
    ];
  }

  protected updated(changedProperties): void {
    super.updated(changedProperties);
    if (
      changedProperties.has("selector") &&
      this.selector.device.integration &&
      !this._entitySources
    ) {
      fetchEntitySourcesWithCache(this.hass).then((sources) => {
        this._entitySources = sources;
      });
    }
  }

  protected render() {
    if (this.selector.device.integration && !this._entitySources) {
      return html``;
    }

    if (!this.selector.device.multiple) {
      return html`
        <ha-device-picker
          .hass=${this.hass}
          .value=${this.value}
          .label=${this.label}
          .helper=${this.helper}
          .deviceFilter=${this._filterDevices}
          .includeDeviceClasses=${this.selector.device.entity?.device_class
            ? [this.selector.device.entity.device_class]
            : undefined}
          .includeDomains=${this.selector.device.entity?.domain
            ? [this.selector.device.entity.domain]
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
        .includeDeviceClasses=${this.selector.device.entity?.device_class
          ? [this.selector.device.entity.device_class]
          : undefined}
        .includeDomains=${this.selector.device.entity?.domain
          ? [this.selector.device.entity.domain]
          : undefined}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-devices-picker>
    `;
  }

  private _filterDevices = (device: DeviceRegistryEntry): boolean => {
    const {
      manufacturer: filterManufacturer,
      model: filterModel,
      integration: filterIntegration,
    } = this.selector.device;

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
    "ha-selector-device": HaDeviceSelector;
  }
}
