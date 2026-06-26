import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import type { ConfigEntry } from "../../data/config_entries";
import { getConfigEntries } from "../../data/config_entries";
import { getDeviceIntegrationLookup } from "../../data/device/device_registry";
import type { EntitySources } from "../../data/entity/entity_sources";
import { fetchEntitySourcesWithCache } from "../../data/entity/entity_sources";
import type { EntitySelector } from "../../data/selector";
import {
  computeCreateDomains,
  filterSelectorEntities,
} from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../entity/ha-entities-picker";
import "../entity/ha-entity-picker";

@customElement("ha-selector-entity")
export class HaEntitySelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: EntitySelector;

  @state() private _entitySources?: EntitySources;

  @state() private _configEntries?: ConfigEntry[];

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property() public placeholder?: any;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @state() private _createDomains: string[] | undefined;

  private _deviceIntegrationLookup = memoizeOne(
    (
      entitySources: EntitySources,
      entities: HomeAssistant["entities"],
      devices: HomeAssistant["devices"],
      configEntries?: ConfigEntry[]
    ) =>
      getDeviceIntegrationLookup(
        entitySources,
        Object.values(entities),
        Object.values(devices),
        configEntries
      )
  );

  // Which async data the current filter needs to be evaluated: a top-level or
  // device `integration` filter needs entity sources, and a `device.integration`
  // filter additionally needs config entries (the device integration lookup is
  // built from both).
  private _dataNeeds = memoizeOne((selector: EntitySelector) => {
    const filters = selector.entity?.filter
      ? ensureArray(selector.entity.filter)
      : [];
    return {
      entitySources: filters.some(
        (f) => f.integration || f.device?.integration
      ),
      configEntries: filters.some((f) => f.device?.integration),
    };
  });

  private _fetchedConfigEntries = false;

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.get("selector") && this.value !== undefined) {
      if (this.selector.entity?.multiple && !Array.isArray(this.value)) {
        this.value = [this.value];
        fireEvent(this, "value-changed", { value: this.value });
      } else if (!this.selector.entity?.multiple && Array.isArray(this.value)) {
        this.value = this.value[0];
        fireEvent(this, "value-changed", { value: this.value });
      }
    }
  }

  protected render() {
    const needs = this._dataNeeds(this.selector);
    if (
      (needs.entitySources && !this._entitySources) ||
      (needs.configEntries && !this._configEntries)
    ) {
      return nothing;
    }

    if (!this.selector.entity?.multiple) {
      return html`<ha-entity-picker
        .value=${typeof this.value === "string" ? this.value : ""}
        .label=${this.label}
        .placeholder=${this.placeholder}
        .helper=${this.helper}
        .includeEntities=${this.selector.entity?.include_entities}
        .excludeEntities=${this.selector.entity?.exclude_entities}
        .extraOptions=${this.selector.entity?.extra_options}
        .entityFilter=${this._filterEntities}
        .createDomains=${this._createDomains}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-entity-picker>`;
    }

    return html`
      <ha-entities-picker
        .value=${this.value}
        .label=${this.label}
        .placeholder=${this.placeholder}
        .helper=${this.helper}
        .includeEntities=${this.selector.entity.include_entities}
        .excludeEntities=${this.selector.entity.exclude_entities}
        .reorder=${this.selector.entity.reorder ?? false}
        .entityFilter=${this._filterEntities}
        .createDomains=${this._createDomains}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-entities-picker>
    `;
  }

  protected updated(changedProps: PropertyValues<this>): void {
    super.updated(changedProps);

    // The connection changed (e.g. reconnect); refetch config entries.
    const oldHass = changedProps.get("hass");
    if (oldHass && oldHass.connection !== this.hass.connection) {
      this._fetchedConfigEntries = false;
      this._configEntries = undefined;
    }

    const needs = this._dataNeeds(this.selector);

    if (needs.entitySources && !this._entitySources) {
      fetchEntitySourcesWithCache(this.hass).then((sources) => {
        this._entitySources = sources;
      });
    }

    if (needs.configEntries && !this._fetchedConfigEntries) {
      this._fetchedConfigEntries = true;
      getConfigEntries(this.hass)
        .then((entries) => {
          this._configEntries = entries;
        })
        .catch(() => {
          // Allow a retry and fall back to no entries so the picker renders
          this._fetchedConfigEntries = false;
          this._configEntries = [];
        });
    }

    if (changedProps.has("selector")) {
      this._createDomains = computeCreateDomains(this.selector);
    }
  }

  private _filterEntities = (entity: HassEntity): boolean => {
    if (!this.selector?.entity?.filter) {
      return true;
    }
    const deviceIntegrationLookup =
      this._entitySources && this._dataNeeds(this.selector).configEntries
        ? this._deviceIntegrationLookup(
            this._entitySources,
            this.hass.entities,
            this.hass.devices,
            this._configEntries
          )
        : undefined;

    return ensureArray(this.selector.entity.filter).some((filter) =>
      filterSelectorEntities(
        filter,
        entity,
        this._entitySources,
        this.hass.entities,
        this.hass.devices,
        deviceIntegrationLookup
      )
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-entity": HaEntitySelector;
  }
}
