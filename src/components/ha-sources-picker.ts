import type { HassServiceTarget } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ensureArray } from "../common/array/ensure-array";
import { fireEvent } from "../common/dom/fire_event";
import { computeDomain } from "../common/entity/compute_domain";
import type { DataTableFiltersValue } from "../data/data_table_filters";
import type { HaEntityPickerEntityFilterFunc } from "../data/entity/entity";
import type { EntitySources } from "../data/entity/entity_sources";
import type { HomeAssistant } from "../types";
import "./ha-filter-device-classes";
import "./ha-filter-domains";
import "./ha-filter-integrations";
import "./ha-target-picker";

/**
 * Ways to narrow down the entities a target selection resolves to. Not to be
 * confused with `EntitySources`, which maps an entity to its integration.
 */
export interface SourceFilters {
  domains?: string[];
  deviceClasses?: string[];
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
 * Narrows entity IDs down by the selected filters: an entity is kept when it
 * matches every filter that has a selection.
 */
export const applySourceFilters = (
  entityIds: string[],
  filters: SourceFilters,
  states: HomeAssistant["states"],
  entities: HomeAssistant["entities"],
  entitySources?: EntitySources
): string[] => {
  const domains = filters.domains?.length ? filters.domains : undefined;
  const deviceClasses = filters.deviceClasses?.length
    ? filters.deviceClasses
    : undefined;
  const integrations = filters.integrations?.length
    ? filters.integrations
    : undefined;

  if (!domains && !deviceClasses && !integrations) {
    return entityIds;
  }

  return entityIds.filter((entityId) => {
    if (domains && !domains.includes(computeDomain(entityId))) {
      return false;
    }
    if (deviceClasses) {
      const deviceClass = states[entityId]?.attributes.device_class;
      if (!deviceClass || !deviceClasses.includes(deviceClass)) {
        return false;
      }
    }
    if (integrations) {
      const integration =
        entities[entityId]?.platform ?? entitySources?.[entityId]?.domain;
      if (!integration || !integrations.includes(integration)) {
        return false;
      }
    }
    return true;
  });
};

/**
 * Picker for what a page shows: the targets to include, narrowed down by
 * domain, device class and integration. Meant to be placed in an
 * `ha-filter-pane`.
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
        .primaryEntitiesOnly=${false}
        .disabled=${this.disabled}
        @value-changed=${this._targetsChanged}
      ></ha-target-picker>
      <div
        class=${classMap({ filters: true, expanded: !!this._expandedFilter })}
      >
        <ha-filter-domains
          .value=${this.filters.domains}
          .expanded=${this._expandedFilter === "domains"}
          @data-table-filter-changed=${this._domainsChanged}
          @expanded-changed=${this._domainsExpanded}
        ></ha-filter-domains>
        <ha-filter-device-classes
          .value=${this.filters.deviceClasses}
          .expanded=${this._expandedFilter === "deviceClasses"}
          @data-table-filter-changed=${this._deviceClassesChanged}
          @expanded-changed=${this._deviceClassesExpanded}
        ></ha-filter-device-classes>
        <ha-filter-integrations
          .value=${this.filters.integrations}
          .expanded=${this._expandedFilter === "integrations"}
          @data-table-filter-changed=${this._integrationsChanged}
          @expanded-changed=${this._integrationsExpanded}
        ></ha-filter-integrations>
      </div>
    `;
  }

  protected firstUpdated() {
    // The filter panels label themselves with keys from the config panel.
    this.hass.loadFragmentTranslation("config");
  }

  private _targetsChanged(ev: CustomEvent) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", { value: ev.detail.value || {} });
  }

  private _domainsChanged(ev: CustomEvent) {
    this._filterChanged("domains", ev);
  }

  private _deviceClassesChanged(ev: CustomEvent) {
    this._filterChanged("deviceClasses", ev);
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

  private _domainsExpanded(ev: CustomEvent) {
    this._filterExpanded("domains", ev);
  }

  private _deviceClassesExpanded(ev: CustomEvent) {
    this._filterExpanded("deviceClasses", ev);
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
