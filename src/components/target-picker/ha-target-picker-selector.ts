import type { LitVirtualizer } from "@lit-labs/virtualizer";
import { consume } from "@lit/context";
import { mdiCheck, mdiPlus, mdiTextureBox } from "@mdi/js";
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
import { tinykeys } from "tinykeys";
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
import { domainToName } from "../../data/integration";
import { getLabels, type LabelRegistryEntry } from "../../data/label_registry";
import {
  isHelperDomain,
  type HelperDomain,
} from "../../panels/config/helpers/const";
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
const CREATE_ID = "___create-new-entity___";

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

  @property({ attribute: false, type: Array }) public createDomains?: string[];

  @query("lit-virtualizer") private _virtualizerElement?: LitVirtualizer;

  @state() private _searchTerm = "";

  @state() private _listScrolled = false;

  @state() private _configEntryLookup: Record<string, ConfigEntry> = {};

  @state() private _selectedItemIndex = -1;

  @state()
  @consume({ context: labelsContext, subscribe: true })
  _labelRegistry!: LabelRegistryEntry[];

  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  private _removeKeyboardShortcuts?: () => void;

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      this._loadConfigEntries();
      loadVirtualizer();
    }
  }

  protected firstUpdated() {
    this._registerKeyboardShortcuts();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._removeKeyboardShortcuts?.();
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

  private _registerKeyboardShortcuts() {
    this._removeKeyboardShortcuts = tinykeys(this, {
      ArrowUp: this._selectPreviousItem,
      ArrowDown: this._selectNextItem,
      Enter: this._pickSelectedItem,
    });
  }

  private _selectNextItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    if (!this._virtualizerElement) {
      return;
    }

    const items = this._virtualizerElement.items;

    const maxItems = items.length - 1;

    if (maxItems === -1) {
      this._selectedItemIndex = -1;
      return;
    }

    const nextIndex =
      maxItems === this._selectedItemIndex
        ? this._selectedItemIndex
        : this._selectedItemIndex + 1;

    if (!items[nextIndex]) {
      return;
    }

    if (
      typeof items[nextIndex] === "string" ||
      (items[nextIndex] as PickerComboBoxItem)?.id === EMPTY_SEARCH
    ) {
      // Skip titles, padding and empty search
      if (nextIndex === maxItems) {
        return;
      }
      this._selectedItemIndex = nextIndex + 1;
    } else {
      this._selectedItemIndex = nextIndex;
    }

    this._virtualizerElement?.scrollToIndex(this._selectedItemIndex, "end");
  };

  private _selectPreviousItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    if (!this._virtualizerElement) {
      return;
    }

    if (this._selectedItemIndex > 0) {
      const nextIndex = this._selectedItemIndex - 1;

      const items = this._virtualizerElement.items;

      if (!items[nextIndex]) {
        return;
      }

      if (
        typeof items[nextIndex] === "string" ||
        (items[nextIndex] as PickerComboBoxItem)?.id === EMPTY_SEARCH
      ) {
        // Skip titles, padding and empty search
        if (nextIndex === 0) {
          return;
        }
        this._selectedItemIndex = nextIndex - 1;
      } else {
        this._selectedItemIndex = nextIndex;
      }

      this._virtualizerElement?.scrollToIndex(this._selectedItemIndex, "end");
    }
  };

  private _pickSelectedItem = () => {
    if (this._selectedItemIndex === -1) {
      return;
    }

    const item: any = this._virtualizerElement?.items[this._selectedItemIndex];
    if (item && typeof item !== "string") {
      this._pickTarget(
        item.id,
        "domain" in item
          ? "device"
          : "stateObj" in item
            ? "entity"
            : item.type
              ? "area"
              : "label"
      );
    }
  };

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

  private _renderRow = (
    item:
      | PickerComboBoxItem
      | (FloorComboBoxItem & { last?: boolean | undefined })
      | EntityComboBoxItem
      | DevicePickerItem,
    index
  ) => {
    if (!item) {
      return nothing;
    }

    if (typeof item === "string") {
      if (item === "padding") {
        return html`<div class="bottom-padding"></div>`;
      }
      return html`<div class="title">${item}</div>`;
    }

    let type: TargetType | "empty" = "label";
    let hasFloor = false;
    let rtl = false;
    let showEntityId = false;

    if (
      (item as FloorComboBoxItem).type === "area" ||
      (item as FloorComboBoxItem).type === "floor"
    ) {
      type = (item as FloorComboBoxItem).type;
      const areaItem = item as FloorComboBoxItem;
      item.id = item[areaItem.type]?.[`${areaItem.type}_id`];

      rtl = computeRTL(this.hass);
      hasFloor = areaItem.type === "area" && !!areaItem.area?.floor_id;
      // return this._areaRowRenderer(
      //   item as FloorComboBoxItem & { last?: boolean },
      //   index
      // );
    }

    if ("domain" in item) {
      type = "device";
      // return this._deviceRowRenderer(item, index);
    }

    if ("stateObj" in item) {
      type = "entity";
      showEntityId = !!this._showEntityId;
      // return this._entityRowRenderer(item, index);
    }

    if (item.id === EMPTY_SEARCH) {
      type = "empty";
    }

    // label or empty
    return html`
      <ha-combo-box-item
        tabindex="-1"
        class=${this._selectedItemIndex === index ? "selected" : ""}
        .type=${type === "empty" ? "text" : "button"}
        @click=${this._handlePickTarget}
        .targetType=${type}
        .targetId=${item.id}
        style=${(item as FloorComboBoxItem).type === "area" && hasFloor
          ? "--md-list-item-leading-space: 48px;"
          : ""}
      >
        ${(item as FloorComboBoxItem).type === "area" && hasFloor
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
                .end=${(
                  item as FloorComboBoxItem & { last?: boolean | undefined }
                ).last}
                slot="start"
              ></ha-tree-indicator>
            `
          : nothing}
        ${item.icon
          ? html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`
          : item.icon_path
            ? html`<ha-svg-icon
                slot="start"
                .path=${item.icon_path}
              ></ha-svg-icon>`
            : (item as EntityComboBoxItem).stateObj
              ? html`
                  <state-badge
                    slot="start"
                    .stateObj=${(item as EntityComboBoxItem).stateObj}
                    .hass=${this.hass}
                  ></state-badge>
                `
              : (item as DevicePickerItem).domain
                ? html`
                    <img
                      slot="start"
                      alt=""
                      crossorigin="anonymous"
                      referrerpolicy="no-referrer"
                      src=${brandsUrl({
                        domain: (item as DevicePickerItem).domain!,
                        type: "icon",
                        darkOptimized: this.hass.themes.darkMode,
                      })}
                    />
                  `
                : (item as FloorComboBoxItem).type === "floor" &&
                    (item as FloorComboBoxItem).floor
                  ? html`<ha-floor-icon
                      slot="start"
                      .floor=${(item as FloorComboBoxItem).floor}
                    ></ha-floor-icon>`
                  : item.icon
                    ? html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`
                    : html`<ha-svg-icon
                        slot="start"
                        .path=${item.icon_path || mdiTextureBox}
                      ></ha-svg-icon>`}
        <span slot="headline">${item.primary}</span>
        ${item.secondary
          ? html`<span slot="supporting-text">${item.secondary}</span>`
          : nothing}
        ${(item as EntityComboBoxItem).stateObj && showEntityId
          ? html`
              <span slot="supporting-text" class="code">
                ${(item as EntityComboBoxItem).stateObj?.entity_id}
              </span>
            `
          : nothing}
        ${(item as EntityComboBoxItem).domain_name &&
        (type !== "entity" || !showEntityId)
          ? html`
              <div slot="trailing-supporting-text" class="domain">
                ${(item as EntityComboBoxItem).domain_name}
              </div>
            `
          : nothing}
      </ha-combo-box-item>
    `;
  };

  private _filterGroup(
    type: TargetType,
    items: (FloorComboBoxItem | PickerComboBoxItem | EntityComboBoxItem)[],
    checkExact?: (
      item: FloorComboBoxItem | PickerComboBoxItem | EntityComboBoxItem
    ) => boolean
  ) {
    const fuseIndex = this._fuseIndexes[type](items);
    const fuse = new HaFuse(items, { shouldSort: false }, fuseIndex);

    const results = fuse.multiTermsSearch(this._searchTerm);
    let filteredItems = items;
    if (results) {
      filteredItems = results.map((result) => result.item);
    }

    if (!checkExact) {
      return filteredItems;
    }

    // If there is exact match for entity id, put it first
    const index = filteredItems.findIndex((item) => checkExact(item));
    if (index === -1) {
      return filteredItems;
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
        entities = this._filterGroup(
          "entity",
          entities,
          (item: EntityComboBoxItem) =>
            item.stateObj?.entity_id === this._searchTerm
        ) as EntityComboBoxItem[];
      }

      if (entities.length > 0 && this.filterTypes.length !== 1) {
        // show group title
        items.push(
          this.hass.localize("ui.components.target-picker.type.entities")
        );
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
        devices = this._filterGroup("device", devices);
      }

      if (devices.length > 0 && this.filterTypes.length !== 1) {
        // show group title
        items.push(
          this.hass.localize("ui.components.target-picker.type.devices")
        );
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
        labels = this._filterGroup("label", labels);
      }

      if (labels.length > 0 && this.filterTypes.length !== 1) {
        // show group title
        items.push(
          this.hass.localize("ui.components.target-picker.type.labels")
        );
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
        areasAndFloors = this._filterGroup(
          "area",
          areasAndFloors
        ) as FloorComboBoxItem[];
      }

      if (areasAndFloors.length > 0 && this.filterTypes.length !== 1) {
        // show group title
        items.push(
          this.hass.localize("ui.components.target-picker.type.areas")
        );
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

    items.push(...this._getCreateItems(this.createDomains));

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

  private _getCreateItems = memoizeOne(
    (createDomains: this["createDomains"]) => {
      if (!createDomains?.length) {
        return [];
      }

      return createDomains.map((domain) => {
        const primary = this.hass.localize(
          "ui.components.entity.entity-picker.create_helper",
          {
            domain: isHelperDomain(domain)
              ? this.hass.localize(
                  `ui.panel.config.helpers.types.${domain as HelperDomain}`
                )
              : domainToName(this.hass.localize, domain),
          }
        );

        return {
          id: CREATE_ID + domain,
          primary: primary,
          secondary: this.hass.localize(
            "ui.components.entity.entity-picker.new_entity"
          ),
          icon_path: mdiPlus,
        } satisfies EntityComboBoxItem;
      });
    }
  );

  private _fuseIndexes = {
    area: memoizeOne((states: FloorComboBoxItem[]) =>
      this._createFuseIndex(states)
    ),
    entity: memoizeOne((states: EntityComboBoxItem[]) =>
      this._createFuseIndex(states)
    ),
    device: memoizeOne((states: DevicePickerItem[]) =>
      this._createFuseIndex(states)
    ),
    label: memoizeOne((states: PickerComboBoxItem[]) =>
      this._createFuseIndex(states)
    ),
  };

  private _createFuseIndex = (states) =>
    Fuse.createIndex(["search_labels"], states);

  private _searchChanged(ev: Event) {
    const textfield = ev.target as HaTextField;
    const value = textfield.value.trim();
    this._searchTerm = value;
    this._selectedItemIndex = -1;
  }

  private _handlePickTarget = (ev) => {
    const id = ev.currentTarget?.targetId as string;
    const type = ev.currentTarget?.targetType as TargetType;

    if (!id || !type) {
      return;
    }

    this._pickTarget(id, type);
  };

  private _pickTarget = (id: string, type: TargetType) => {
    if (type === "label" && id === EMPTY_SEARCH) {
      return;
    }

    if (id.startsWith(CREATE_ID)) {
      const domain = id.substring(CREATE_ID.length);

      fireEvent(this, "create-domain-picked", domain);
      return;
    }

    fireEvent(this, "target-picked", {
      id,
      type,
    });
  };

  private get _showEntityId() {
    return this.hass.userData?.showEntityIdPicker;
  }

  private _toggleFilter(ev: any) {
    this._selectedItemIndex = -1;
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
        padding: 0 12px;
        overflow: auto;
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

      ha-combo-box-item.selected {
        background-color: var(--ha-color-fill-neutral-quiet-hover);
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
    "create-domain-picked": string;
  }
}
