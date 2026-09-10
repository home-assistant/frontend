import type { HassServiceTarget } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { ensureArray } from "../common/array/ensure-array";
import { fireEvent } from "../common/dom/fire_event";
import type { DataTableFiltersValue } from "../data/data_table_filters";
import type { HaEntityPickerEntityFilterFunc } from "../data/entity/entity";
import { entityTypeFilterFunc } from "../data/entity/entity_type";
import type { EntitySources } from "../data/entity/entity_sources";
import type { HomeAssistant } from "../types";
import "./ha-filter-entity-types";
import "./ha-filter-integrations";
import "./ha-target-picker";

/**
 * Ways to narrow down the entities a target selection resolves to. Not to be
 * confused with `EntitySources`, which maps an entity to its integration.
 */
export interface SourceFilters {
  /** Domains (`sensor`) and domains narrowed to a device class (`sensor/power`). */
  types?: string[];
  integrations?: string[];
}

const TARGET_KEYS = [
  "floor_id",
  "area_id",
  "device_id",
  "entity_id",
  "label_id",
] as const;

/** Number of picked targets, no matter which type they are. */
export const countTargets = (target: HassServiceTarget): number =>
  TARGET_KEYS.reduce(
    (count, key) => count + (target[key] ? ensureArray(target[key]).length : 0),
    0
  );

/** Number of filters that have at least one option selected. */
export const countSourceFilters = (filters: SourceFilters): number =>
  Object.values(filters).filter((value) => value?.length).length;

/**
 * Matches an entity against the selected filters: it is kept when it matches
 * every filter that has a selection. Undefined when nothing is selected.
 */
export const sourceFilterFunc = (
  filters: SourceFilters,
  states: HomeAssistant["states"],
  entities: HomeAssistant["entities"],
  entitySources?: EntitySources
): ((entityId: string) => boolean) | undefined => {
  const matchesType = filters.types?.length
    ? entityTypeFilterFunc(filters.types, states)
    : undefined;
  const integrations = filters.integrations?.length
    ? filters.integrations
    : undefined;

  if (!matchesType && !integrations) {
    return undefined;
  }

  return (entityId: string) => {
    if (matchesType && !matchesType(entityId)) {
      return false;
    }
    if (integrations) {
      const integration =
        entities[entityId]?.platform ?? entitySources?.[entityId]?.domain;
      if (!integration || !integrations.includes(integration)) {
        return false;
      }
    }
    return true;
  };
};

/** Narrows entity IDs down by the selected filters. */
export const applySourceFilters = (
  entityIds: string[],
  filters: SourceFilters,
  states: HomeAssistant["states"],
  entities: HomeAssistant["entities"],
  entitySources?: EntitySources
): string[] => {
  const matches = sourceFilterFunc(filters, states, entities, entitySources);
  return matches ? entityIds.filter(matches) : entityIds;
};

/**
 * Picker for what a page shows: the targets to include, narrowed down by
 * entity type and integration. Meant to be placed in an `ha-filter-pane`.
 *
 * The pages resolve every entity of a target, secondary ones included, so the
 * target picker counts them too.
 */
@customElement("ha-sources-picker")
export class HaSourcesPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value: HassServiceTarget = {};

  @property({ attribute: false }) public filters: SourceFilters = {};

  @property({ attribute: false })
  public entityFilter?: HaEntityPickerEntityFilterFunc;

  @property({ attribute: false }) public entitySources?: EntitySources;

  /** Explains what the page shows while no target is picked. */
  @property() public description?: string;

  @property({ type: Boolean }) public disabled = false;

  // Only one filter panel is expanded at a time, so that the expanded one can
  // use the height that is left in the pane.
  @state() private _expandedFilter?: keyof SourceFilters;

  protected render() {
    const noTargets = countTargets(this.value) === 0;

    return html`
      ${
        this.description && noTargets
          ? html`<div class="description">${this.description}</div>`
          : nothing
      }
      <ha-target-picker
        class=${classMap({ "no-padding-top": noTargets })}
        .hass=${this.hass}
        .value=${this.value}
        .entityFilter=${this.entityFilter}
        .activeFilter=${this._activeFilter(
          this.filters,
          this.hass.states,
          this.hass.entities,
          this.entitySources
        )}
        .primaryEntitiesOnly=${false}
        .disabled=${this.disabled}
        @value-changed=${this._targetsChanged}
      ></ha-target-picker>
      <div
        class=${classMap({ filters: true, expanded: !!this._expandedFilter })}
      >
        <ha-filter-entity-types
          .value=${this.filters.types}
          .expanded=${this._expandedFilter === "types"}
          @data-table-filter-changed=${this._typesChanged}
          @expanded-changed=${this._typesExpanded}
        ></ha-filter-entity-types>
        <ha-filter-integrations
          .value=${this.filters.integrations}
          .expanded=${this._expandedFilter === "integrations"}
          @data-table-filter-changed=${this._integrationsChanged}
          @expanded-changed=${this._integrationsExpanded}
        ></ha-filter-integrations>
      </div>
    `;
  }

  private _activeFilter = memoizeOne(sourceFilterFunc);

  protected firstUpdated() {
    // The filter panels label themselves with keys from the config panel.
    this.hass.loadFragmentTranslation("config");
  }

  private _targetsChanged(ev: CustomEvent) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", { value: ev.detail.value || {} });
  }

  private _typesChanged(ev: CustomEvent) {
    this._filterChanged("types", ev);
  }

  private _integrationsChanged(ev: CustomEvent) {
    this._filterChanged("integrations", ev);
  }

  private _filterChanged(key: keyof SourceFilters, ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as DataTableFiltersValue;
    fireEvent(this, "source-filters-changed", {
      value: {
        ...this.filters,
        [key]: Array.isArray(value) && value.length ? value : undefined,
      },
    });
  }

  private _typesExpanded(ev: CustomEvent) {
    this._filterExpanded("types", ev);
  }

  private _integrationsExpanded(ev: CustomEvent) {
    this._filterExpanded("integrations", ev);
  }

  private _filterExpanded(key: keyof SourceFilters, ev: CustomEvent) {
    if (ev.detail.expanded) {
      this._expandedFilter = key;
    } else if (this._expandedFilter === key) {
      this._expandedFilter = undefined;
    }
  }

  static styles = css`
    /* The sections are laid out by the pane, so that an expanded filter
         panel can use the height that is left. */
    :host {
      display: contents;
    }

    .description {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 92px;
      margin: var(--ha-space-4) var(--ha-space-4) 0;
      padding: 0 var(--ha-space-6);
      border-radius: var(--ha-border-radius-lg);
      background-color: var(--ha-color-fill-neutral-quiet-resting);
      text-align: center;
      color: var(--secondary-text-color);
    }

    ha-target-picker {
      display: block;
      flex: none;
      padding: var(--ha-space-4);
    }

    /* The description already spaces the picker from the pane header. */
    ha-target-picker.no-padding-top {
      padding-top: 0;
    }

    .filters {
      display: flex;
      flex-direction: column;
      flex: 1 0 auto;
      border-top: 1px solid var(--divider-color);
    }

    /* An expanded panel sizes itself to the space that is left over. */
    .filters.expanded {
      flex: 1 1 auto;
      min-height: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sources-picker": HaSourcesPicker;
  }
  interface HASSDomEvents {
    "source-filters-changed": { value: SourceFilters };
  }
}
