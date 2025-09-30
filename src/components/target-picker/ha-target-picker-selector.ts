import type { LitVirtualizer } from "@lit-labs/virtualizer";
import { consume } from "@lit/context";
import { mdiCheck, mdiTextureBox } from "@mdi/js";
import Fuse from "fuse.js";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import {
  customElement,
  eventOptions,
  property,
  query,
  state,
} from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import type { LocalizeKeys } from "../../common/translations/localize";
import { computeRTL } from "../../common/util/compute_rtl";
import {
  getAreasAndFloors,
  type AreaFloorValue,
  type FloorComboBoxItem,
} from "../../data/area_floor";
import { getConfigEntries, type ConfigEntry } from "../../data/config_entries";
import { labelsContext } from "../../data/context";
import { getDevices, type DevicePickerItem } from "../../data/device_registry";
import type { HaEntityPickerEntityFilterFunc } from "../../data/entity";
import {
  getEntities,
  type EntityComboBoxItem,
} from "../../data/entity_registry";
import { getLabels, type LabelRegistryEntry } from "../../data/label_registry";
import { HaFuse } from "../../resources/fuse";
import { haStyleScrollbar } from "../../resources/styles";
import { loadVirtualizer } from "../../resources/virtualizer";
import type { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import type { HaDevicePickerDeviceFilterFunc } from "../device/ha-device-picker";
import "../entity/state-badge";
import "../ha-button";
import "../ha-combo-box-item";
import "../ha-floor-icon";
import "../ha-md-list";
import type { PickerComboBoxItem } from "../ha-picker-combo-box";
import "../ha-svg-icon";
import "../ha-textfield";
import type { HaTextField } from "../ha-textfield";
import "../ha-tree-indicator";
import type { TargetType } from "./ha-target-picker-item-row";

const SEPARATOR = "________";

const EMPTY_SEARCH = "___EMPTY_SEARCH___";

export type TargetTypeFloorless = Exclude<TargetType, "floor">;

@customElement("ha-target-picker-selector")
export class HaTargetPickerSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public filterTypes: TargetTypeFloorless[] =
    [];

  @property({ reflect: true }) public mode: "popover" | "dialog" = "popover";

  /**
   * Show only targets with entities from specific domains.
   * @type {Array}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show only targets with entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  @property({ attribute: false })
  public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property({ attribute: false })
  public entityFilter?: HaEntityPickerEntityFilterFunc;

  @property({ attribute: false }) public targetValue?: HassServiceTarget;

  @query("lit-virtualizer") private _virtualizerElement?: LitVirtualizer;

  @state() private _searchTerm = "";

  @state() private _listScrolled = false;

  @state() private _configEntryLookup: Record<string, ConfigEntry> = {};

  @state()
  @consume({ context: labelsContext, subscribe: true })
  _labelRegistry!: LabelRegistryEntry[];

  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      this._loadConfigEntries();
      loadVirtualizer();
    }
  }

  private async _loadConfigEntries() {
    const configEntries = await getConfigEntries(this.hass);
    this._configEntryLookup = Object.fromEntries(
      configEntries.map((entry) => [entry.entry_id, entry])
    );
  }

  protected render() {
    return html`
      <ha-textfield
        .label=${this.hass.localize("ui.common.search")}
        @input=${this._searchChanged}
        .value=${this._searchTerm}
      ></ha-textfield>
      <div class="filter">${this._renderFilterButtons()}</div>
      <lit-virtualizer
        scroller
        .items=${this._getItems()}
        .renderItem=${this._renderRow}
        @scroll=${this._onScrollList}
        class="list ${this._listScrolled ? "scrolled" : ""}"
        style="min-height: 56px;"
      >
      </lit-virtualizer>
    `;
  }

  private _renderFilterButtons() {
    const filter: (TargetTypeFloorless | "separator")[] = [
      "entity",
      "device",
      "area",
      "separator",
      "label",
    ];
    return filter.map((filterType) => {
      if (filterType === "separator") {
        return html`<div class="separator"></div>`;
      }

      const selected = this.filterTypes.includes(filterType);
      return html`
        <ha-button
          @click=${this._toggleFilter}
          .type=${filterType}
          size="small"
          .variant=${selected ? "brand" : "neutral"}
          appearance="filled"
        >
          ${selected
            ? html`<ha-svg-icon slot="start" .path=${mdiCheck}></ha-svg-icon>`
            : nothing}
          ${this.hass.localize(
            `ui.components.target-picker.type.${filterType === "entity" ? "entities" : `${filterType}s`}` as LocalizeKeys
          )}
        </ha-button>
      `;
    });
  }

  private _renderRow = (item) => {
    if (!item) {
      return nothing;
    }

    if (typeof item === "string") {
      if (item === "padding") {
        return html`<div class="bottom-padding"></div>`;
      }
      return html`<div class="title">${item}</div>`;
    }

    if (item.type === "area" || item.type === "floor") {
      return this._areaRowRenderer(item);
    }

    if ("domain" in item) {
      return this._deviceRowRenderer(item);
    }

    if ("stateObj" in item) {
      return this._entityRowRenderer(item);
    }

    // label or empty
    return html`
      <ha-combo-box-item
        .type=${item.id === EMPTY_SEARCH ? "text" : "button"}
        @click=${
          // eslint-disable-next-line lit/no-template-arrow
          () => {
            this._pickTarget(item.id, "label");
          }
        }
      >
        ${item.icon
          ? html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`
          : item.icon_path
            ? html`<ha-svg-icon
                slot="start"
                .path=${item.icon_path}
              ></ha-svg-icon>`
            : nothing}
        <span slot="headline">${item.primary}</span>
        ${item.secondary
          ? html`<span slot="supporting-text">${item.secondary}</span>`
          : nothing}
      </ha-combo-box-item>
    `;
  };

  private _filterAreasAndFloors(items: FloorComboBoxItem[]) {
    const index = this._areaFuseIndex(items);
    const fuse = new HaFuse(items, { shouldSort: false }, index);

    const results = fuse.multiTermsSearch(this._searchTerm);
    let filteredItems = items as FloorComboBoxItem[];
    if (results) {
      filteredItems = results.map((result) => result.item);
    }

    return filteredItems;
  }

  private _filterEntities(items: EntityComboBoxItem[]) {
    const fuseIndex = this._entityFuseIndex(items);
    const fuse = new HaFuse(items, { shouldSort: false }, fuseIndex);

    const results = fuse.multiTermsSearch(this._searchTerm);
    let filteredItems = items as EntityComboBoxItem[];
    if (results) {
      filteredItems = results.map((result) => result.item);
    }

    // If there is exact match for entity id, put it first
    const index = filteredItems.findIndex(
      (item) => item.stateObj?.entity_id === this._searchTerm
    );
    if (index === -1) {
      return filteredItems;
    }

    const [exactMatch] = filteredItems.splice(index, 1);
    filteredItems.unshift(exactMatch);
    return filteredItems;
  }

  private _filterDevices(items: PickerComboBoxItem[]) {
    const fuseIndex = this._deviceFuseIndex(items);
    const fuse = new HaFuse(items, { shouldSort: false }, fuseIndex);

    const results = fuse.multiTermsSearch(this._searchTerm);
    let filteredItems = items as DevicePickerItem[];
    if (results) {
      filteredItems = results.map((result) => result.item);
    }

    return filteredItems;
  }

  private _filterLabels(items: PickerComboBoxItem[]) {
    const fuseIndex = this._labelFuseIndex(items);
    const fuse = new HaFuse(items, { shouldSort: false }, fuseIndex);

    const results = fuse.multiTermsSearch(this._searchTerm);
    let filteredItems = items as PickerComboBoxItem[];
    if (results) {
      filteredItems = results.map((result) => result.item);
    }

    return filteredItems;
  }

  private _getItems = () => {
    const items: (
      | string
      | FloorComboBoxItem
      | EntityComboBoxItem
      | PickerComboBoxItem
    )[] = [];

    if (this.filterTypes.length === 0 || this.filterTypes.includes("entity")) {
      let entities = getEntities(
        this.hass,
        this.includeDomains,
        undefined,
        this.entityFilter,
        this.includeDeviceClasses,
        undefined,
        undefined,
        this.targetValue?.entity_id
          ? ensureArray(this.targetValue.entity_id)
          : undefined
      );

      if (this._searchTerm) {
        entities = this._filterEntities(entities);
      }

      if (entities.length > 0 && this.filterTypes.length !== 1) {
        items.push(
          this.hass.localize("ui.components.target-picker.type.entities")
        ); // title
      }

      items.push(...entities);
    }

    if (this.filterTypes.length === 0 || this.filterTypes.includes("device")) {
      let devices = getDevices(
        this.hass,
        this._configEntryLookup,
        this.includeDomains,
        undefined,
        this.includeDeviceClasses,
        this.deviceFilter,
        this.entityFilter,
        this.targetValue?.device_id
          ? ensureArray(this.targetValue.device_id)
          : undefined
      );

      if (this._searchTerm) {
        devices = this._filterDevices(devices);
      }

      if (devices.length > 0 && this.filterTypes.length !== 1) {
        items.push(
          this.hass.localize("ui.components.target-picker.type.devices")
        ); // title
      }

      items.push(...devices);
    }

    if (this.filterTypes.length === 0 || this.filterTypes.includes("label")) {
      let labels = getLabels(
        this.hass,
        this._labelRegistry,
        this.includeDomains,
        undefined,
        this.includeDeviceClasses,
        this.deviceFilter,
        this.entityFilter,
        this.targetValue?.label_id
          ? ensureArray(this.targetValue.label_id)
          : undefined
      );

      if (this._searchTerm) {
        labels = this._filterLabels(labels);
      }

      if (labels.length > 0 && this.filterTypes.length !== 1) {
        items.push(
          this.hass.localize("ui.components.target-picker.type.labels")
        ); // title
      }

      items.push(...labels);
    }

    if (this.filterTypes.length === 0 || this.filterTypes.includes("area")) {
      let areasAndFloors = getAreasAndFloors(
        this.hass.states,
        this.hass.floors,
        this.hass.areas,
        this.hass.devices,
        this.hass.entities,
        memoizeOne((value: AreaFloorValue): string =>
          [value.type, value.id].join(SEPARATOR)
        ),
        this.includeDomains,
        undefined,
        this.includeDeviceClasses,
        this.deviceFilter,
        this.entityFilter,
        this.targetValue?.area_id
          ? ensureArray(this.targetValue.area_id)
          : undefined,
        this.targetValue?.floor_id
          ? ensureArray(this.targetValue.floor_id)
          : undefined
      );

      if (this._searchTerm) {
        areasAndFloors = this._filterAreasAndFloors(areasAndFloors);
      }

      if (areasAndFloors.length > 0 && this.filterTypes.length !== 1) {
        items.push(
          this.hass.localize("ui.components.target-picker.type.areas")
        ); // title
      }

      items.push(
        ...areasAndFloors.map((item, index) => {
          const nextItem = areasAndFloors[index + 1];

          if (
            !nextItem ||
            (item.type === "area" && nextItem.type === "floor")
          ) {
            return {
              ...item,
              last: true,
            };
          }

          return item;
        })
      );
    }

    if (this._searchTerm && items.length === 0) {
      items.push({
        id: EMPTY_SEARCH,
        primary: this.hass.localize(
          "ui.components.target-picker.no_target_found",
          { term: html`<span class="search-term">"${this._searchTerm}"</span>` }
        ),
      });
    } else if (items.length === 0) {
      items.push({
        id: EMPTY_SEARCH,
        primary: this.hass.localize("ui.components.target-picker.no_targets"),
      });
    }

    if (this.mode === "dialog") {
      items.push("padding"); // padding for safe area inset
    }

    return items;
  };

  private _areaFuseIndex = memoizeOne((states: FloorComboBoxItem[]) =>
    Fuse.createIndex(["search_labels"], states)
  );

  private _entityFuseIndex = memoizeOne((states: EntityComboBoxItem[]) =>
    Fuse.createIndex(["search_labels"], states)
  );

  private _deviceFuseIndex = memoizeOne((states: DevicePickerItem[]) =>
    Fuse.createIndex(["search_labels"], states)
  );

  private _labelFuseIndex = memoizeOne((states: PickerComboBoxItem[]) =>
    Fuse.createIndex(["search_labels"], states)
  );

  private _searchChanged(ev: Event) {
    const textfield = ev.target as HaTextField;
    const value = textfield.value.trim();
    this._searchTerm = value;
  }

  private _pickTarget = (id: string, type: TargetType) => {
    if (type === "label" && id === EMPTY_SEARCH) {
      return;
    }
    fireEvent(this, "target-picked", {
      id,
      type,
    });
  };

  private _areaRowRenderer = (item: FloorComboBoxItem & { last?: boolean }) => {
    const rtl = computeRTL(this.hass);

    const hasFloor = item.type === "area" && item.area?.floor_id;

    return html`
      <ha-combo-box-item
        type="button"
        style=${item.type === "area" && hasFloor
          ? "--md-list-item-leading-space: 48px;"
          : ""}
        @click=${
          // eslint-disable-next-line lit/no-template-arrow
          () => {
            this._pickTarget(item[item.type]?.[`${item.type}_id`], item.type);
          }
        }
      >
        ${item.type === "area" && hasFloor
          ? html`
              <ha-tree-indicator
                style=${styleMap({
                  width: "48px",
                  position: "absolute",
                  top: "0px",
                  left: rtl ? undefined : "4px",
                  right: rtl ? "4px" : undefined,
                  transform: rtl ? "scaleX(-1)" : "",
                })}
                .end=${item.last}
                slot="start"
              ></ha-tree-indicator>
            `
          : nothing}
        ${item.type === "floor" && item.floor
          ? html`<ha-floor-icon
              slot="start"
              .floor=${item.floor}
            ></ha-floor-icon>`
          : item.icon
            ? html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`
            : html`<ha-svg-icon
                slot="start"
                .path=${item.icon_path || mdiTextureBox}
              ></ha-svg-icon>`}
        ${item.primary}
      </ha-combo-box-item>
    `;
  };

  private _deviceRowRenderer(item: DevicePickerItem) {
    return html`
      <ha-combo-box-item
        type="button"
        @click=${
          // eslint-disable-next-line lit/no-template-arrow
          () => {
            this._pickTarget(item.id, "device");
          }
        }
      >
        ${item.domain
          ? html`
              <img
                slot="start"
                alt=""
                crossorigin="anonymous"
                referrerpolicy="no-referrer"
                src=${brandsUrl({
                  domain: item.domain,
                  type: "icon",
                  darkOptimized: this.hass.themes.darkMode,
                })}
              />
            `
          : nothing}

        <span slot="headline">${item.primary}</span>
        ${item.secondary
          ? html`<span slot="supporting-text">${item.secondary}</span>`
          : nothing}
        ${item.domain_name
          ? html`
              <div slot="trailing-supporting-text" class="domain">
                ${item.domain_name}
              </div>
            `
          : nothing}
      </ha-combo-box-item>
    `;
  }

  private get _showEntityId() {
    return this.hass.userData?.showEntityIdPicker;
  }

  private _entityRowRenderer = (item: EntityComboBoxItem) => {
    const showEntityId = this._showEntityId;

    return html`
      <ha-combo-box-item
        type="button"
        compact
        @click=${
          // eslint-disable-next-line lit/no-template-arrow
          () => {
            this._pickTarget(item.id, "entity");
          }
        }
      >
        ${item.icon_path
          ? html`
              <ha-svg-icon
                slot="start"
                style="margin: 0 4px"
                .path=${item.icon_path}
              ></ha-svg-icon>
            `
          : html`
              <state-badge
                slot="start"
                .stateObj=${item.stateObj}
                .hass=${this.hass}
              ></state-badge>
            `}
        <span slot="headline">${item.primary}</span>
        ${item.secondary
          ? html`<span slot="supporting-text">${item.secondary}</span>`
          : nothing}
        ${item.stateObj && showEntityId
          ? html`
              <span slot="supporting-text" class="code">
                ${item.stateObj.entity_id}
              </span>
            `
          : nothing}
        ${item.domain_name && !showEntityId
          ? html`
              <div slot="trailing-supporting-text" class="domain">
                ${item.domain_name}
              </div>
            `
          : nothing}
      </ha-combo-box-item>
    `;
  };

  private _toggleFilter(ev: any) {
    const type = ev.target.type as TargetTypeFloorless;
    if (!type) {
      return;
    }
    const index = this.filterTypes.indexOf(type);
    if (index === -1) {
      this.filterTypes = [...this.filterTypes, type];
    } else {
      this.filterTypes = this.filterTypes.filter((t) => t !== type);
    }

    // Reset scroll position when filter changes
    if (this._virtualizerElement) {
      this._virtualizerElement.scrollTop = 0;
    }

    fireEvent(this, "filter-types-changed", this.filterTypes);
  }

  @eventOptions({ passive: true })
  private _onScrollList(ev) {
    const top = ev.target.scrollTop ?? 0;
    this._listScrolled = top > 0;
  }

  static styles = [
    haStyleScrollbar,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding-top: 12px;
        flex: 1;
      }

      ha-textfield {
        padding: 0 12px;
      }

      .filter {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        padding: 0 12px;
        --ha-button-border-radius: var(--ha-border-radius-md);
      }

      .filter .separator {
        height: 32px;
        width: 0;
        border: 1px solid var(--ha-color-border-neutral-quiet);
      }

      .title {
        width: 100%;
        background-color: var(--ha-color-fill-neutral-quiet-resting);
        padding: 4px 8px;
        font-weight: var(--ha-font-weight-bold);
        color: var(--secondary-text-color);
      }

      :host([mode="dialog"]) .title {
        padding: 4px 16px;
      }

      :host([mode="dialog"]) .filter,
      :host([mode="dialog"]) ha-textfield {
        padding: 0 16px;
      }

      ha-combo-box-item {
        width: 100%;
      }

      lit-virtualizer {
        flex: 1;
      }

      lit-virtualizer.scrolled {
        border-top: 1px solid var(--ha-color-border-neutral-quiet);
      }

      .bottom-padding {
        height: max(var(--safe-area-inset-bottom, 0px), 32px);
        width: 100%;
      }

      .search-term {
        color: var(--primary-color);
        font-weight: var(--ha-font-weight-medium);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-target-picker-selector": HaTargetPickerSelector;
  }

  interface HASSDomEvents {
    "filter-types-changed": TargetTypeFloorless[];
    "target-picked": {
      type: TargetType;
      id: string;
    };
  }
}
