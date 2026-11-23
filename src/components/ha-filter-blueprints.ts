import type { ContextType } from "@lit/context";
import { mdiFilterVariantRemove } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { createRef, ref } from "lit/directives/ref";
import memoizeOne from "memoize-one";
import {
  FilterPanelController,
  filterPanelStyles,
} from "../common/controllers/filter-panel-controller";
import { consume } from "../common/decorators/consume";
import { transform } from "../common/decorators/transform";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";
import { arrayWith, arrayWithout } from "../common/array/array-with";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
} from "../common/dom/fire_event";
import { fireEvent } from "../common/dom/fire_event";
import type { ListFilterValue } from "../data/data_table_filters";
import {
  hasFilterSelection,
  listFilterEventValue,
  listFilterValue,
  NO_VALUE_ID,
} from "../data/data_table_filters";
import { computeDomain } from "../common/entity/compute_domain";
import { deepEqual } from "../common/util/deep-equal";
import { mapWithConcurrency } from "../common/util/map-with-concurrency";
import type { Blueprints } from "../data/blueprint";
import { fetchBlueprints } from "../data/blueprint";
import { apiContext, connectionContext, statesContext } from "../data/context";
import { findRelated, RELATED_SEARCH_CONCURRENCY } from "../data/search";
import "./ha-expansion-panel";
import "./ha-icon-button";
import "./item/ha-list-item-option";
import type { HaListItemOption } from "./item/ha-list-item-option";
import "./list/ha-list-selectable";
import type { HaListSelectable } from "./list/ha-list-selectable";

@customElement("ha-filter-blueprints")
export class HaFilterBlueprints extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  // Only a state being added or removed can change the items without a
  // blueprint, so plain state updates keep the previous set and don't rerender
  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<ContextType<typeof statesContext>, Set<string>>({
    transformer: function (this: HaFilterBlueprints, states) {
      const ids = new Set(Object.keys(states));
      return deepEqual(ids, this._stateIds) ? this._stateIds : ids;
    },
  })
  private _stateIds?: Set<string>;

  // Home Assistant may have restarted with edited items while the connection
  // was down, which nothing else here tells
  @state()
  @consume({ context: connectionContext, subscribe: true })
  @transform<ContextType<typeof connectionContext>, boolean>({
    transformer: ({ connected }) => connected,
  })
  private _connected?: boolean;

  // A plain list of ids is still accepted
  @property({ attribute: false }) public value?: string[] | ListFilterValue;

  @property() public type?: "automation" | "script";

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state() private _blueprints?: Blueprints;

  private _content = createRef<HTMLElement>();

  private _panel = new FilterPanelController(this, this._content);

  private _relatedRequestId = 0;

  // The last lookup of the items without a blueprint, reused while the items
  // are the same, such as when only the selection changes
  private _withoutBlueprint?: {
    type: "automation" | "script";
    itemIds: string[];
    items: Promise<string[]>;
    controller: AbortController;
  };

  public connectedCallback() {
    super.connectedCallback();
    // The config pages are cached, so an item may have been edited while this
    // filter was not on screen
    this._dropWithoutBlueprint();
    if (this.hasUpdated && hasFilterSelection(this.value)) {
      this._findRelated();
    }
  }

  // Untyped, as it also checks private state
  public willUpdate(properties: PropertyValues) {
    super.willUpdate(properties);

    const reconnected =
      properties.get("_connected") === false && !!this._connected;
    if (reconnected) {
      this._dropWithoutBlueprint();
    }

    if (
      (properties.has("value") &&
        !deepEqual(this.value, properties.get("value"))) ||
      // Items without a blueprint are worked out from the states
      (listFilterValue(this.value)?.none &&
        (properties.has("_stateIds") || reconnected))
    ) {
      this._findRelated();
    }
  }

  protected render() {
    return html`
      <ha-expansion-panel
        left-chevron
        .expanded=${this.expanded}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this._localize("ui.panel.config.blueprint.caption")}
          ${
            this._count
              ? html`<div class="badge">${this._count}</div>
                  <ha-icon-button
                    .path=${mdiFilterVariantRemove}
                    .label=${this._localize(
                      "ui.components.subpage-data-table.clear_filter"
                    )}
                    @click=${this._clearFilter}
                  ></ha-icon-button>`
              : nothing
          }
        </div>
      </ha-expansion-panel>
      ${
        this._panel.showContent
          ? html`
              <div class="content" ${ref(this._content)}>
                ${
                  this._blueprints
                    ? html`
                        <ha-list-selectable
                          multi
                          aria-label=${this._localize(
                            "ui.panel.config.blueprint.caption"
                          )}
                          @ha-list-item-selected=${this._handleItemToggled}
                          @ha-list-item-deselected=${this._handleItemToggled}
                        >
                          ${Object.entries(this._blueprints).map(
                            ([id, blueprint]) =>
                              "error" in blueprint
                                ? nothing
                                : html`<ha-list-item-option
                                    appearance="checkbox"
                                    selection-position="end"
                                    .value=${id}
                                    .selected=${listFilterValue(this.value)?.ids?.includes(id) ?? false}
                                  >
                                    <span slot="headline"
                                      >${blueprint.metadata.name || id}</span
                                    >
                                  </ha-list-item-option>`
                          )}
                          <ha-list-item-option
                            appearance="checkbox"
                            selection-position="end"
                            .value=${NO_VALUE_ID}
                            .selected=${listFilterValue(this.value)?.none ?? false}
                          >
                            <span slot="headline" class="no-value"
                              >${this._localize(
                                "ui.components.subpage-data-table.no_blueprint"
                              )}</span
                            >
                          </ha-list-item-option>
                        </ha-list-selectable>
                      `
                    : nothing
                }
              </div>
            `
          : nothing
      }
    `;
  }

  protected async firstUpdated() {
    if (!this.type) {
      return;
    }
    this._blueprints = await fetchBlueprints(this._api.callWS, this.type);
  }

  private get _count(): number {
    const value = listFilterValue(this.value);
    return (value?.ids?.length || 0) + (value?.none ? 1 : 0);
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private _handleItemToggled(
    ev: HASSDomEvent<number> & HASSDomCurrentTargetEvent<HaListSelectable>
  ) {
    const blueprintId = (
      ev.currentTarget.items[ev.detail] as HaListItemOption | undefined
    )?.value;
    if (!blueprintId) {
      return;
    }

    const value = listFilterValue(this.value) ?? {};
    if (blueprintId === NO_VALUE_ID) {
      this.value = { ...value, none: ev.type === "ha-list-item-selected" };
      return;
    }
    this.value = {
      ...value,
      ids:
        ev.type === "ha-list-item-selected"
          ? arrayWith(value.ids, blueprintId)
          : arrayWithout(value.ids, blueprintId),
    };
  }

  private async _findRelated() {
    const requestId = ++this._relatedRequestId;
    const value = listFilterValue(this.value) ?? {};

    if (!hasFilterSelection(value)) {
      fireEvent(this, "data-table-filter-changed", {
        value: listFilterEventValue(value),
        items: undefined,
      });
      return;
    }

    const type = this.type;

    let results: Set<string> | undefined;
    let withoutBlueprint: string[] | undefined;
    try {
      [results, withoutBlueprint] = await Promise.all([
        type ? this._findForBlueprints(type, value.ids ?? []) : undefined,
        type && value.none ? this._itemsWithoutBlueprint(type) : undefined,
      ]);
    } catch (err) {
      // A newer lookup took over and stopped this one
      if (requestId !== this._relatedRequestId) {
        return;
      }
      throw err;
    }

    // The value changed while this lookup ran
    if (requestId !== this._relatedRequestId) {
      return;
    }

    const items = new Set<string>(withoutBlueprint);
    results?.forEach((item) => items.add(item));

    fireEvent(this, "data-table-filter-changed", {
      value: listFilterEventValue(value),
      items: type ? items : undefined,
    });
  }

  // The automations or scripts made from any of the blueprints
  private async _findForBlueprints(
    type: "automation" | "script",
    blueprintIds: string[],
    signal?: AbortSignal
  ): Promise<Set<string>> {
    const results = await mapWithConcurrency(
      blueprintIds,
      RELATED_SEARCH_CONCURRENCY,
      (blueprintId) => findRelated(this._api, `${type}_blueprint`, blueprintId),
      signal
    );
    return new Set(results.flatMap((result) => result[type] ?? []));
  }

  private _itemsWithoutBlueprint(
    type: "automation" | "script"
  ): Promise<string[]> {
    // Only items of this type count, so another entity being added or removed
    // doesn't look them all up again
    const itemIds = this._itemIds(this._stateIds, type);
    const cached = this._withoutBlueprint;
    if (cached?.type === type && deepEqual(cached.itemIds, itemIds)) {
      return cached.items;
    }

    // Stop the lookup this one replaces from starting more searches
    this._dropWithoutBlueprint();
    const controller = new AbortController();
    const items = this._searchItemsWithoutBlueprint(
      type,
      itemIds,
      controller.signal
    );
    const lookup = { type, itemIds, items, controller };
    this._withoutBlueprint = lookup;
    // Look them up again next time when this lookup fails
    items.catch(() => {
      if (this._withoutBlueprint === lookup) {
        this._withoutBlueprint = undefined;
      }
    });
    return items;
  }

  private _dropWithoutBlueprint() {
    this._withoutBlueprint?.controller.abort();
    this._withoutBlueprint = undefined;
  }

  // The ids of the automations or the scripts
  private _itemIds = memoizeOne(
    (stateIds: Set<string> | undefined, type: "automation" | "script") =>
      [...(stateIds ?? [])]
        .filter((entityId) => computeDomain(entityId) === type)
        .sort()
  );

  private async _searchItemsWithoutBlueprint(
    type: "automation" | "script",
    itemIds: string[],
    signal: AbortSignal
  ): Promise<string[]> {
    // A blueprint can be added while the page stays open, so get the current
    // ones, which also updates the list
    const blueprints = await fetchBlueprints(this._api.callWS, type);
    this._blueprints = blueprints;
    const fromBlueprint = await this._findForBlueprints(
      type,
      Object.keys(blueprints),
      signal
    );
    return itemIds.filter((entityId) => !fromBlueprint.has(entityId));
  }

  private _clearFilter(ev) {
    ev.preventDefault();
    this.value = undefined;
    fireEvent(this, "data-table-filter-changed", {
      value: undefined,
      items: undefined,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      filterPanelStyles,
      css`
        ha-list-selectable {
          display: flex;
          flex: 1;
          min-height: 0;
        }
        ha-list-selectable::part(base) {
          flex: 1;
          min-height: 0;
        }
        .header {
          display: flex;
          align-items: center;
        }
        .header ha-icon-button {
          margin-inline-start: auto;
          margin-inline-end: 8px;
        }
        .badge {
          display: inline-block;
          margin-left: 8px;
          margin-inline-start: 8px;
          margin-inline-end: 0;
          min-width: 16px;
          box-sizing: border-box;
          border-radius: var(--ha-border-radius-circle);
          font-size: var(--ha-font-size-xs);
          font-weight: var(--ha-font-weight-normal);
          background-color: var(--primary-color);
          line-height: var(--ha-line-height-normal);
          text-align: center;
          padding: 0px 2px;
          color: var(--text-primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-blueprints": HaFilterBlueprints;
  }
}
