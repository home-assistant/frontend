import type { HassServiceTarget } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { ensureArray } from "../common/array/ensure-array";
import { fireEvent } from "../common/dom/fire_event";
import type { DataTableFiltersValue } from "../data/data_table_filters";
import type { HaEntityPickerEntityFilterFunc } from "../data/entity/entity";
import { entityTypeFilterFunc } from "../data/entity/entity_type";
import type { EntitySources } from "../data/entity/entity_sources";
import type { HomeAssistant } from "../types";
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

/** Sets one filter from the value of its `data-table-filter-changed` event. */
export const setSourceFilter = <T extends SourceFilters>(
  filters: T,
  key: keyof T,
  value: DataTableFiltersValue
): T => ({
  ...filters,
  [key]: Array.isArray(value) && value.length ? value : undefined,
});

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
 * Picks the targets a page shows. Meant to be placed in an `ha-filter-pane`,
 * above the filters the page narrows them down with.
 *
 * The pages resolve every entity of a target, secondary ones included, so the
 * target picker counts them too.
 */
@customElement("ha-sources-picker")
export class HaSourcesPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value: HassServiceTarget = {};

  /** The filters the page applies, so the picker counts what they keep. */
  @property({ attribute: false }) public filters: SourceFilters = {};

  @property({ attribute: false })
  public entityFilter?: HaEntityPickerEntityFilterFunc;

  @property({ attribute: false }) public entitySources?: EntitySources;

  /** Explains what the page shows while no target is picked. */
  @property() public description?: string;

  @property({ type: Boolean }) public disabled = false;

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
    `;
  }

  private _activeFilter = memoizeOne(sourceFilterFunc);

  private _targetsChanged(ev: CustomEvent) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", { value: ev.detail.value || {} });
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
  `;
}

/** Lays out the filters that follow the picker in the pane. */
export const sourceFiltersStyles = css`
  .filters {
    display: flex;
    flex-direction: column;
    flex: 1 0 auto;
    border-top: 1px solid var(--divider-color);
  }

  /* An expanded panel sizes itself to the space that is left over, but
       keeps room for its list when the targets fill the pane. */
  .filters.expanded {
    flex: 1 1 auto;
    min-height: min(360px, 100%);
  }
`;

declare global {
  interface HTMLElementTagNameMap {
    "ha-sources-picker": HaSourcesPicker;
  }
}
