import type { ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { consume } from "../../common/decorators/consume";
import { fireEvent } from "../../common/dom/fire_event";
import type { ConfigEntry } from "../../data/config_entries";
import { getConfigEntries } from "../../data/config_entries";
import {
  apiContext,
  connectionContext,
  devicesContext,
  entitiesContext,
  statesContext,
} from "../../data/context";
import { getDeviceIntegrationLookup } from "../../data/device/device_registry";
import type { EntitySources } from "../../data/entity/entity_sources";
import { fetchEntitySourcesWithCache } from "../../data/entity/entity_sources";
import type { EntitySelector } from "../../data/selector";
import {
  computeCreateDomains,
  filterSelectorEntities,
} from "../../data/selector";
import type { HomeAssistant, HomeAssistantConnection } from "../../types";
import "../entity/ha-entities-picker";
import "../entity/ha-entity-picker";

@customElement("ha-selector-entity")
export class HaEntitySelector extends LitElement {
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

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection?: ContextType<typeof connectionContext>;

  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: ContextType<typeof entitiesContext>;

  @consume({ context: devicesContext, subscribe: true })
  private _devices!: ContextType<typeof devicesContext>;

  private _deviceIntegrationLookup = memoizeOne(
    (
      entities: HomeAssistant["entities"] | null,
      devices: HomeAssistant["devices"] | null,
      configEntries?: ConfigEntry[]
    ) =>
      getDeviceIntegrationLookup(
        Object.values(entities ?? {}),
        Object.values(devices ?? {}),
        configEntries
      )
  );

  // Which async data the current filter needs to be evaluated: a top-level
  // `integration` filter needs entity sources, and a `device.integration`
  // filter needs config entries.
  private _dataNeeds = memoizeOne((selector: EntitySelector) => {
    const filters = selector.entity?.filter
      ? ensureArray(selector.entity.filter)
      : [];
    return {
      entitySources: filters.some((f) => f.integration),
      configEntries: filters.some((f) => f.device?.integration),
    };
  });

  private _fetchedConfigEntries = false;

  private _fetchedEntitySources = false;

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
        .entityFilter=${this._filterEntities(
          this.selector,
          this._entitySources,
          this._configEntries
        )}
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
        .entityFilter=${this._filterEntities(
          this.selector,
          this._entitySources,
          this._configEntries
        )}
        .createDomains=${this._createDomains}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-entities-picker>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    const oldConnection = changedProps.get("_connection") as
      HomeAssistantConnection | undefined;
    if (
      oldConnection &&
      this._connection &&
      (oldConnection.connection !== this._connection.connection ||
        (!oldConnection.connected && this._connection.connected))
    ) {
      this._fetchedEntitySources = false;
      this._fetchedConfigEntries = false;
    }

    const needs = this._dataNeeds(this.selector);

    if (needs.entitySources && !this._fetchedEntitySources) {
      this._fetchedEntitySources = true;
      fetchEntitySourcesWithCache(this._api.callWS, this._states ?? {})
        .then((sources) => {
          this._entitySources = sources;
        })
        .catch(() => {
          this._entitySources ??= {};
        });
    }

    if (needs.configEntries && !this._fetchedConfigEntries) {
      this._fetchedConfigEntries = true;
      getConfigEntries(this._api)
        .then((entries) => {
          this._configEntries = entries;
        })
        .catch(() => {
          // Keep what we have, or fall back to no entries so the picker still
          // renders. A reconnect fetches again.
          this._configEntries ??= [];
        });
    }

    if (changedProps.has("selector")) {
      this._createDomains = computeCreateDomains(this.selector);
    }
  }

  private _filterEntities = memoizeOne(
    (
      selector: EntitySelector,
      entitySources: EntitySources | undefined,
      configEntries: ConfigEntry[] | undefined
    ) =>
      (entity: HassEntity): boolean => {
        if (!selector.entity?.filter) {
          return true;
        }
        const deviceIntegrationLookup = this._dataNeeds(selector).configEntries
          ? this._deviceIntegrationLookup(
              this._entities,
              this._devices,
              configEntries
            )
          : undefined;

        return ensureArray(selector.entity.filter).some((filter) =>
          filterSelectorEntities(
            filter,
            entity,
            entitySources,
            this._entities ?? undefined,
            this._devices ?? undefined,
            deviceIntegrationLookup
          )
        );
      }
  );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-entity": HaEntitySelector;
  }
}
