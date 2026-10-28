import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import type { DeviceRegistryEntry } from "../../data/device/device_registry";
import { getDeviceIntegrationLookup } from "../../data/device/device_registry";
import type { EntitySources } from "../../data/entity/entity_sources";
import { fetchEntitySourcesWithCache } from "../../data/entity/entity_sources";
import type { TargetSelector } from "../../data/selector";
import {
  computeCreateDomains,
  filterSelectorDevices,
  filterSelectorEntities,
} from "../../data/selector";
import type { HassServiceTargetWithExclude } from "../../data/target";
import type { HomeAssistant } from "../../types";
import "../ha-target-picker";

type TargetSelectorFilters = NonNullable<TargetSelector["target"]>;

// The pickers hide devices, areas and labels without entities only when they
// get a filter function, so one is always passed.
const ALL_ENTITIES = () => true;

const ALL_DEVICES = () => true;

@customElement("ha-selector-target")
export class HaTargetSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: TargetSelector;

  @property({ type: Object }) public value?: HassServiceTargetWithExclude;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @state() private _entitySources?: EntitySources;

  @state() private _createDomains: string[] | undefined;

  private _deviceIntegrationLookup = memoizeOne(
    (entities: HomeAssistant["entities"]) =>
      getDeviceIntegrationLookup(Object.values(entities))
  );

  private _hasIntegration(selector: TargetSelector) {
    return (
      (selector.target?.entity &&
        ensureArray(selector.target.entity).some(
          (filter) => filter.integration
        )) ||
      (selector.target?.device &&
        ensureArray(selector.target.device).some(
          (device) => device.integration
        ))
    );
  }

  protected updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    if (
      changedProperties.has("selector") &&
      this._hasIntegration(this.selector) &&
      !this._entitySources
    ) {
      fetchEntitySourcesWithCache(this.hass.callWS, this.hass.states).then(
        (sources) => {
          this._entitySources = sources;
        }
      );
    }
    if (changedProperties.has("selector")) {
      this._createDomains = computeCreateDomains(this.selector);
    }
  }

  protected render() {
    if (this._hasIntegration(this.selector) && !this._entitySources) {
      return nothing;
    }

    return html` ${this.label ? html`<label>${this.label}</label>` : nothing}
      <ha-target-picker
        .hass=${this.hass}
        .value=${this.value}
        .helper=${this.helper}
        .deviceFilter=${this._deviceFilter(this.selector.target?.device)}
        .entityFilter=${this._entityFilter(
          this.selector.target?.entity,
          this._entitySources
        )}
        .disabled=${this.disabled}
        .createDomains=${this._createDomains}
        .primaryEntitiesOnly=${this.selector.target?.primary_entities_only}
        allow-exclude
      ></ha-target-picker>`;
  }

  // The picker caches its lists per filter function, so a new function is
  // only made when the selector filters change.
  private _entityFilter = memoizeOne(
    (
      filters: TargetSelectorFilters["entity"],
      entitySources: EntitySources | undefined
    ) => {
      if (!filters) {
        return ALL_ENTITIES;
      }
      return (entity: HassEntity): boolean =>
        ensureArray(filters).some((filter) =>
          filterSelectorEntities(
            filter,
            entity,
            entitySources,
            this.hass.entities,
            this.hass.devices
          )
        );
    }
  );

  private _deviceFilter = memoizeOne(
    (filters: TargetSelectorFilters["device"]) => {
      if (!filters) {
        return ALL_DEVICES;
      }
      return (device: DeviceRegistryEntry): boolean => {
        const deviceIntegrations = this._hasIntegration(this.selector)
          ? this._deviceIntegrationLookup(this.hass.entities)
          : undefined;
        return ensureArray(filters).some((filter) =>
          filterSelectorDevices(filter, device, deviceIntegrations)
        );
      };
    }
  );

  static styles = css`
    label {
      display: block;
      margin-bottom: var(--ha-space-2);
      font-weight: var(--ha-font-weight-medium);
    }
    ha-target-picker {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-target": HaTargetSelector;
  }
}
