import type { ContextType } from "@lit/context";
import { mdiFilterVariantRemove } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { createRef, ref } from "lit/directives/ref";
import memoizeOne from "memoize-one";
import { computeDomain } from "../common/entity/compute_domain";
import { consume } from "../common/decorators/consume";
import { transform } from "../common/decorators/transform";
import {
  FilterPanelController,
  filterPanelStyles,
} from "../common/controllers/filter-panel-controller";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import { computeDeviceNameDisplay } from "../common/entity/compute_device_name";
import { stringCompare } from "../common/string/compare";
import type { LocalizeFunc } from "../common/translations/localize";
import { deepEqual } from "../common/util/deep-equal";
import { mapWithConcurrency } from "../common/util/map-with-concurrency";
import {
  apiContext,
  devicesContext,
  fullEntitiesContext,
  internationalizationContext,
  statesContext,
} from "../data/context";
import type { ListFilterValue } from "../data/data_table_filters";
import {
  hasFilterSelection,
  listFilterEventValue,
  listFilterValue,
} from "../data/data_table_filters";
import type { RelatedResult } from "../data/search";
import { findRelated, RELATED_SEARCH_CONCURRENCY } from "../data/search";
import "./ha-expansion-panel";
import { filterBadgeStyles, renderFilterBadge } from "./ha-filter-mode";
import "./input/ha-input-search";
import type { HaInputSearch } from "./input/ha-input-search";
import "./item/ha-list-item-option";
import "./list/ha-list-selectable-virtualized";
import type { HaListSelectableVirtualized } from "./list/ha-list-selectable-virtualized";
import type { HaListVirtualizedItem } from "./list/ha-list-virtualized";

interface HaFilterDevicesItem extends HaListVirtualizedItem {
  name: string;
}

interface DeviceLinks {
  deviceIds: string[];
  /** The device of each entity that has one, by entity id */
  entityDevices: Record<string, string>;
}

@customElement("ha-filter-devices")
export class HaFilterDevices extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: devicesContext, subscribe: true })
  @state()
  private _devicesReg!: ContextType<typeof devicesContext>;

  @consume({ context: internationalizationContext, subscribe: true })
  @state()
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @consume({ context: fullEntitiesContext, subscribe: true })
  @state()
  private _entities?: ContextType<typeof fullEntitiesContext>;

  // Only a state being added or removed can change the items without a
  // device, so plain state updates keep the previous set and don't rerender
  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<ContextType<typeof statesContext>, Set<string>>({
    transformer: function (this: HaFilterDevices, states) {
      const ids = new Set(Object.keys(states));
      return deepEqual(ids, this._stateIds) ? this._stateIds : ids;
    },
  })
  private _stateIds?: Set<string>;

  // A plain list of device ids is still accepted from stored filters
  @property({ attribute: false }) public value?: ListFilterValue | string[];

  @property() public type?: keyof RelatedResult;

  @property({ type: Boolean, attribute: "include-disabled-entities" })
  public includeDisabledEntities = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @property({ type: Boolean }) public narrow = false;

  @state() private _filter?: string;

  @query("ha-list-selectable-virtualized")
  private _listElement?: HaListSelectableVirtualized;

  private _content = createRef<HTMLElement>();

  private _panel = new FilterPanelController(this, this._content);

  private _relatedRequestId = 0;

  // The last lookup of the automations, scripts or scenes without a device,
  // reused while nothing it depends on changed, such as when only the mode
  // changes
  private _withoutDevice?: {
    type: keyof RelatedResult;
    includeDisabledEntities: boolean;
    stateIds?: Set<string>;
    links: DeviceLinks;
    items: Promise<string[]>;
  };

  public connectedCallback() {
    super.connectedCallback();
    // An item may have been edited while the cached page was hidden, so look
    // up the items without one again
    this._withoutDevice = undefined;
    if (this.hasUpdated && listFilterValue(this.value)?.none) {
      this._findRelated();
    }
  }

  // Untyped, as it also checks private state
  public willUpdate(properties: PropertyValues) {
    super.willUpdate(properties);

    if (
      (properties.has("value") &&
        !deepEqual(this.value, properties.get("value"))) ||
      // Items without a device are worked out from the registries and states
      (listFilterValue(this.value)?.none &&
        (properties.has("_devicesReg") ||
          properties.has("_entities") ||
          properties.has("_stateIds")))
    ) {
      this._findRelated();
    }
  }

  protected updated(properties: PropertyValues<this>) {
    super.updated(properties);

    // The rows don't change with the value, so render the selection again
    if (properties.has("value")) {
      this._listElement?.requestRowsUpdate();
    }
  }

  // The id of the No device option, which can't be a device id
  private static readonly _noneId = "__none__";

  protected render() {
    const value = listFilterValue(this.value);
    const count = (value?.ids?.length || 0) + (value?.none ? 1 : 0);
    return html`
      <ha-expansion-panel
        left-chevron
        .expanded=${this.expanded}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this._localize("ui.panel.config.devices.caption")}
          ${
            count
              ? html`${renderFilterBadge(this._localize, count, value?.exclude)}
                  <ha-icon-button
                    .path=${mdiFilterVariantRemove}
                    .label=${this._localize(
                      "ui.components.subpage-data-table.clear_filter"
                    )}
                    @click=${this._clearFilter}
                    @keydown=${this._handleClearFilterKeydown}
                  ></ha-icon-button>`
              : nothing
          }
        </div>
      </ha-expansion-panel>
      ${
        this._panel.showContent
          ? html`<div class="content" ${ref(this._content)}>
              <ha-filter-mode
                .exclude=${value?.exclude ?? false}
                @filter-mode-changed=${this._modeChanged}
              ></ha-filter-mode>
              <ha-input-search
                appearance="outlined"
                .value=${this._filter}
                @input=${this._handleSearchChange}
                @keydown=${this._handleSearchKeydown}
              >
              </ha-input-search>
              <ha-list-selectable-virtualized
                multi
                .rows=${this._devices(
                  this._devicesReg,
                  this._filter || "",
                  this._localize,
                  this._i18n.locale.language
                )}
                .rowRenderer=${this._renderItem}
                @ha-list-item-selected=${this._handleAdded}
                @ha-list-item-deselected=${this._handleRemoved}
              ></ha-list-selectable-virtualized>
            </div>`
          : nothing
      }
    `;
  }

  private _renderItem = (item?: HaFilterDevicesItem) =>
    !item
      ? nothing
      : html`<ha-list-item-option
          style="width: 100%;"
          appearance="checkbox"
          selection-position="end"
          .value=${item.id}
          .selected=${this._isSelected(item.id)}
        >
          <span
            slot="headline"
            style=${
              // The rows render in the list's own shadow root, which the
              // filter's styles don't reach
              item.id === HaFilterDevices._noneId ? "font-style: italic" : ""
            }
            >${item.name}</span
          >
        </ha-list-item-option>`;

  private _isSelected(id: string): boolean {
    const value = listFilterValue(this.value);
    return id === HaFilterDevices._noneId
      ? (value?.none ?? false)
      : (value?.ids?.includes(id) ?? false);
  }

  private _handleAdded(ev: CustomEvent<number>) {
    this._toggle(ev.detail, true);
  }

  private _handleRemoved(ev: CustomEvent<number>) {
    this._toggle(ev.detail, false);
  }

  private _toggle(index: number, selected: boolean) {
    const id = this._devices(
      this._devicesReg,
      this._filter || "",
      this._localize,
      this._i18n.locale.language
    )[index]?.id;
    if (!id) {
      return;
    }
    const value = listFilterValue(this.value) ?? {};
    if (id === HaFilterDevices._noneId) {
      this.value = { ...value, none: selected };
      return;
    }
    const ids = (value.ids ?? []).filter((deviceId) => deviceId !== id);
    this.value = { ...value, ids: selected ? [...ids, id] : ids };
  }

  private _modeChanged(ev: CustomEvent<{ exclude: boolean }>) {
    this.value = { ...listFilterValue(this.value), exclude: ev.detail.exclude };
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private _handleSearchChange(ev: InputEvent) {
    const target = ev.target as HaInputSearch;
    this._filter = target.value ?? "";
  }

  private _handleSearchKeydown(ev: KeyboardEvent) {
    if (ev.key === "ArrowDown" && this._listElement) {
      ev.preventDefault();
      this._listElement.focus();
    }
  }

  private _devices = memoizeOne(
    (
      devices: ContextType<typeof devicesContext>,
      filter: string,
      localize: LocalizeFunc,
      language: string | undefined
    ): HaFilterDevicesItem[] => {
      const values = Object.values(devices);
      const noDevice: HaFilterDevicesItem = {
        id: HaFilterDevices._noneId,
        interactive: true,
        name: localize("ui.components.subpage-data-table.no_device"),
      };
      return [
        ...values
          .map((device) => ({
            id: device.id,
            interactive: true,
            name: computeDeviceNameDisplay(device, localize),
          }))
          .sort((a, b) => stringCompare(a.name, b.name, language)),
        noDevice,
      ].filter(
        ({ name }) =>
          !filter || name.toLowerCase().includes(filter.toLowerCase())
      );
    }
  );

  private async _findRelated() {
    const requestId = ++this._relatedRequestId;
    const value = listFilterValue(this.value);

    if (!value || !hasFilterSelection(value)) {
      fireEvent(this, "data-table-filter-changed", {
        value: listFilterEventValue(value ?? {}),
        items: undefined,
      });
      return;
    }

    const type = this.type;

    const [results, withoutDevice] = await Promise.all([
      type
        ? Promise.all(
            (value.ids ?? []).map((deviceId) =>
              findRelated(
                this._api,
                "device",
                deviceId,
                this.includeDisabledEntities
              )
            )
          )
        : [],
      type && value.none ? this._itemsWithoutDevice(type) : [],
    ]);

    // The value changed while this lookup ran
    if (requestId !== this._relatedRequestId) {
      return;
    }

    const items = new Set<string>(withoutDevice);
    for (const result of results) {
      result[type!]?.forEach((item) => items.add(item));
    }

    fireEvent(this, "data-table-filter-changed", {
      value: listFilterEventValue(value),
      items: type ? items : undefined,
    });
  }

  private async _itemsWithoutDevice(
    type: keyof RelatedResult
  ): Promise<string[]> {
    if (type === "entity") {
      const entities = this._entities || [];
      const items = entities
        .filter(
          (entity) =>
            (this.includeDisabledEntities || !entity.disabled_by) &&
            !(entity.device_id && entity.device_id in this._devicesReg)
        )
        .map((entity) => entity.entity_id);
      // Entities without a registry entry can't have a device
      const registered = new Set(entities.map((entity) => entity.entity_id));
      for (const entityId of this._stateIds || []) {
        if (!registered.has(entityId)) {
          items.push(entityId);
        }
      }
      return items;
    }

    // Most registry updates, like renaming an entity, don't change which
    // devices the items use, so only search again when these links change
    const links = this._deviceLinks(
      this._devicesReg,
      this._entities,
      this.includeDisabledEntities
    );
    const cached = this._withoutDevice;
    if (
      cached?.type === type &&
      cached.includeDisabledEntities === this.includeDisabledEntities &&
      cached.stateIds === this._stateIds &&
      deepEqual(cached.links, links)
    ) {
      return cached.items;
    }

    const items = this._searchItemsWithoutDevice(type);
    const lookup = {
      type,
      includeDisabledEntities: this.includeDisabledEntities,
      stateIds: this._stateIds,
      links,
      items,
    };
    this._withoutDevice = lookup;
    // Look them up again next time when this lookup fails
    items.catch(() => {
      if (this._withoutDevice === lookup) {
        this._withoutDevice = undefined;
      }
    });
    return items;
  }

  // The devices that exist and the device of each entity the search uses,
  // which is what a search for an item's devices depends on
  private _deviceLinks = memoizeOne(
    (
      devices: ContextType<typeof devicesContext>,
      entities: ContextType<typeof fullEntitiesContext> | undefined,
      includeDisabledEntities: boolean
    ): DeviceLinks => {
      const entityDevices: Record<string, string> = {};
      for (const entity of entities ?? []) {
        if (
          entity.device_id &&
          (includeDisabledEntities || !entity.disabled_by)
        ) {
          entityDevices[entity.entity_id] = entity.device_id;
        }
      }
      return { deviceIds: Object.keys(devices).sort(), entityDevices };
    }
  );

  // Automations, scripts and scenes use a device when they reference it or one
  // of its entities, which only a search for each of them tells. This matches
  // the items a search for each device finds.
  private async _searchItemsWithoutDevice(
    type: keyof RelatedResult
  ): Promise<string[]> {
    const itemIds = [...(this._stateIds || [])].filter(
      (entityId) => computeDomain(entityId) === type
    );
    const results = await mapWithConcurrency(
      itemIds,
      RELATED_SEARCH_CONCURRENCY,
      (itemId) =>
        findRelated(this._api, type, itemId, this.includeDisabledEntities)
    );
    return itemIds.filter((_itemId, index) => !results[index].device?.length);
  }

  private _handleClearFilterKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.stopPropagation();
      this._clearFilter(ev);
    }
  }

  private _clearFilter(ev) {
    ev.preventDefault();
    this.value = undefined;
    fireEvent(this, "data-table-filter-changed", {
      value: undefined,
      items: undefined,
    });
  }

  static styles = [
    filterPanelStyles,
    filterBadgeStyles,
    css`
      ha-list-selectable-virtualized {
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
      ha-input-search {
        display: block;
        padding: var(--ha-space-1) var(--ha-space-2) var(--ha-space-2);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-devices": HaFilterDevices;
  }
}
