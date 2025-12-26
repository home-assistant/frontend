import type { LitVirtualizer } from "@lit-labs/virtualizer";
import { consume } from "@lit/context";
import "@material/mwc-list/mwc-list";
import { mdiPlus, mdiTextureBox } from "@mdi/js";
import Fuse from "fuse.js";
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
import { fireEvent } from "../../../../common/dom/fire_event";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../../common/translations/localize";
import { computeRTL } from "../../../../common/util/compute_rtl";
import "../../../../components/chips/ha-chip-set";
import "../../../../components/chips/ha-filter-chip";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-button-toggle-group";
import "../../../../components/ha-combo-box-item";
import "../../../../components/ha-domain-icon";
import "../../../../components/ha-floor-icon";
import "../../../../components/ha-icon-next";
import type { PickerComboBoxItem } from "../../../../components/ha-picker-combo-box";
import "../../../../components/ha-section-title";
import "../../../../components/ha-tree-indicator";
import { ACTION_BUILDING_BLOCKS_GROUP } from "../../../../data/action";
import {
  areaFloorComboBoxKeys,
  getAreasAndFloors,
  type AreaFloorValue,
  type FloorComboBoxItem,
} from "../../../../data/area_floor_picker";
import { CONDITION_BUILDING_BLOCKS_GROUP } from "../../../../data/condition";
import type { ConfigEntry } from "../../../../data/config_entries";
import { labelsContext } from "../../../../data/context";
import {
  deviceComboBoxKeys,
  getDevices,
  type DevicePickerItem,
} from "../../../../data/device/device_picker";
import {
  entityComboBoxKeys,
  getEntities,
  type EntityComboBoxItem,
} from "../../../../data/entity/entity_picker";
import type { DomainManifestLookup } from "../../../../data/integration";
import {
  getLabels,
  labelComboBoxKeys,
} from "../../../../data/label/label_picker";
import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import {
  getTargetComboBoxItemType,
  TARGET_SEPARATOR,
} from "../../../../data/target";
import {
  multiTermSearch,
  multiTermSortedSearch,
  type FuseWeightedKey,
} from "../../../../resources/fuseMultiTerm";
import { loadVirtualizer } from "../../../../resources/virtualizer";
import type { HomeAssistant } from "../../../../types";
import type {
  AddAutomationElementListItem,
  AutomationItemComboBoxItem,
} from "../add-automation-element-dialog";
import type { AddAutomationElementDialogParams } from "../show-add-automation-element-dialog";

const TARGET_SEARCH_SECTIONS = [
  "separator",
  "entity",
  "device",
  "area",
  "separator",
  "label",
] as const;

export const ITEM_SEARCH_KEYS: FuseWeightedKey[] = [
  {
    name: "primary",
    weight: 10,
  },
  {
    name: "secondary",
    weight: 7,
  },
];

type SearchSection = "item" | "block" | "entity" | "device" | "area" | "label";

@customElement("ha-automation-add-search")
export class HaAutomationAddSearch extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public filter!: string;

  @property({ attribute: false }) public configEntryLookup: Record<
    string,
    ConfigEntry
  > = {};

  @property({ attribute: false }) public manifests?: DomainManifestLookup;

  @property({ attribute: false }) public items!: AddAutomationElementListItem[];

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, attribute: "new-triggers-and-conditions" })
  public newTriggersAndConditions = false;

  @property({ attribute: false })
  public convertToItem!: (
    key: string,
    options,
    type: AddAutomationElementDialogParams["type"],
    localize: LocalizeFunc
  ) => AddAutomationElementListItem;

  @property({ attribute: "add-element-type" }) public addElementType!:
    | "trigger"
    | "condition"
    | "action";

  @state() private _searchSectionTitle?: string;

  @state() private _selectedSearchSection?: SearchSection;

  @state() private _searchListScrolled = false;

  @state()
  @consume({ context: labelsContext, subscribe: true })
  private _labelRegistry!: LabelRegistryEntry[];

  @query("lit-virtualizer") private _virtualizerElement?: LitVirtualizer;

  private _getDevicesMemoized = memoizeOne(getDevices);

  private _getLabelsMemoized = memoizeOne(getLabels);

  private _getEntitiesMemoized = memoizeOne(getEntities);

  private _getAreasAndFloorsMemoized = memoizeOne(getAreasAndFloors);

  private _selectedSearchItemIndex = -1;

  private _removeKeyboardShortcuts?: () => void;

  private get _showEntityId() {
    return this.hass.userData?.showEntityIdPicker;
  }

  protected willUpdate(changedProps: PropertyValues) {
    if (!this.hasUpdated) {
      loadVirtualizer();
    }

    if (!this.hasUpdated || changedProps.has("filter")) {
      if (this._removeKeyboardShortcuts) {
        if (!this.filter) {
          this._removeKeyboardShortcuts();
          this._removeKeyboardShortcuts = undefined;
        }
        return;
      }

      this._removeKeyboardShortcuts = tinykeys(window, {
        ArrowUp: this._selectPreviousSearchItem,
        ArrowDown: this._selectNextSearchItem,
        Home: this._selectFirstSearchItem,
        End: this._selectLastSearchItem,
        Enter: this._pickSelectedSearchItem,
      });
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._removeKeyboardShortcuts?.();
  }

  protected render() {
    const items = this._getFilteredItems(
      this.addElementType,
      this.hass.localize,
      this.filter,
      this.configEntryLookup,
      this.items,
      this.newTriggersAndConditions,
      this._selectedSearchSection
    );

    let emptySearchTranslation: string | undefined;

    if (!items.length) {
      emptySearchTranslation = !this._selectedSearchSection
        ? `ui.panel.config.automation.editor.${this.addElementType}s.empty_search.global`
        : this._selectedSearchSection === "item"
          ? `ui.panel.config.automation.editor.${this.addElementType}s.empty_search.item`
          : `ui.panel.config.automation.editor.empty_section_search.${this._selectedSearchSection}`;
    }

    return html`
      ${this._renderSections()}
      ${emptySearchTranslation
        ? html`<div class="empty-search">
            ${this.hass.localize(emptySearchTranslation as LocalizeKeys, {
              term: html`<b>‘${this.filter}’</b>`,
            })}
          </div>`
        : html`
            <div class="search-results">
              <div class="section-title-wrapper">
                ${!this._selectedSearchSection && this._searchSectionTitle
                  ? html`<ha-section-title>
                      ${this._searchSectionTitle}
                    </ha-section-title>`
                  : nothing}
              </div>
              <lit-virtualizer
                .keyFunction=${this._keyFunction}
                tabindex="0"
                scroller
                .items=${items}
                .renderItem=${this._renderSearchResultRow}
                style="min-height: 36px;"
                class=${this._searchListScrolled ? "scrolled" : ""}
                @scroll=${this._onScrollSearchList}
                @focus=${this._focusSearchList}
                @visibilityChanged=${this._visibilityChanged}
              >
              </lit-virtualizer>
            </div>
          `}
    `;
  }

  private _renderSections() {
    if (this.addElementType === "trigger" && !this.newTriggersAndConditions) {
      return nothing;
    }

    const searchSections: ("separator" | SearchSection)[] = ["item"];

    if (this.addElementType !== "trigger") {
      searchSections.push("block");
    }

    if (this.newTriggersAndConditions) {
      searchSections.push(...TARGET_SEARCH_SECTIONS);
    }
    return html`
      <ha-chip-set class="sections">
        ${searchSections.map((section) =>
          section === "separator"
            ? html`<div class="separator"></div>`
            : html`<ha-filter-chip
                @click=${this._toggleSection}
                .section-id=${section}
                .selected=${this._selectedSearchSection === section}
                .label=${this._getSearchSectionLabel(section)}
              >
              </ha-filter-chip>`
        )}
      </ha-chip-set>
    `;
  }

  private _renderSearchResultRow = (
    item:
      | PickerComboBoxItem
      | (FloorComboBoxItem & { last?: boolean | undefined })
      | EntityComboBoxItem
      | DevicePickerItem
      | AutomationItemComboBoxItem,
    index: number
  ) => {
    if (!item) {
      return nothing;
    }

    if (typeof item === "string") {
      return html`<ha-section-title>${item}</ha-section-title>`;
    }

    const type = ["trigger", "condition", "action", "block"].includes(
      (item as AutomationItemComboBoxItem).type
    )
      ? "item"
      : getTargetComboBoxItemType(item);
    let hasFloor = false;
    let rtl = false;
    let showEntityId = false;

    if (type === "area" || type === "floor") {
      rtl = computeRTL(this.hass);
      hasFloor =
        type === "area" && !!(item as FloorComboBoxItem).area?.floor_id;
    }

    if (type === "entity") {
      showEntityId = !!this._showEntityId;
    }

    return html`
      <ha-combo-box-item
        id=${`search-list-item-${index}`}
        tabindex="-1"
        .type=${type === "empty" ? "text" : "button"}
        class=${type === "empty" ? "empty" : ""}
        style=${(item as FloorComboBoxItem).type === "area" && hasFloor
          ? "--md-list-item-leading-space: var(--ha-space-12);"
          : ""}
        .value=${item}
        @click=${this._selectSearchResult}
      >
        ${(item as FloorComboBoxItem).type === "area" && hasFloor
          ? html`
              <ha-tree-indicator
                style=${styleMap({
                  width: "var(--ha-space-12)",
                  position: "absolute",
                  top: "0",
                  left: rtl ? undefined : "var(--ha-space-1)",
                  right: rtl ? "var(--ha-space-1)" : undefined,
                  transform: rtl ? "scaleX(-1)" : "",
                })}
                .end=${(
                  item as FloorComboBoxItem & { last?: boolean | undefined }
                ).last}
                slot="start"
              ></ha-tree-indicator>
            `
          : nothing}
        ${(item as AutomationItemComboBoxItem).renderedIcon
          ? html`<div slot="start">
              ${(item as AutomationItemComboBoxItem).renderedIcon}
            </div>`
          : item.icon
            ? html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`
            : item.icon_path || type === "area"
              ? html`<ha-svg-icon
                  slot="start"
                  .path=${item.icon_path || mdiTextureBox}
                ></ha-svg-icon>`
              : type === "entity" && (item as EntityComboBoxItem).stateObj
                ? html`
                    <state-badge
                      slot="start"
                      .stateObj=${(item as EntityComboBoxItem).stateObj}
                      .hass=${this.hass}
                    ></state-badge>
                  `
                : type === "device" && (item as DevicePickerItem).domain
                  ? html`
                      <ha-domain-icon
                        slot="start"
                        .hass=${this.hass}
                        .domain=${(item as DevicePickerItem).domain!}
                        brand-fallback
                      ></ha-domain-icon>
                    `
                  : type === "floor"
                    ? html`<ha-floor-icon
                        slot="start"
                        .floor=${(item as FloorComboBoxItem).floor!}
                      ></ha-floor-icon>`
                    : nothing}
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
        ${type === "item"
          ? html`<ha-svg-icon
              class="plus"
              slot="end"
              .path=${mdiPlus}
            ></ha-svg-icon>`
          : this.narrow
            ? html`<ha-icon-next slot="end"></ha-icon-next>`
            : nothing}
      </ha-combo-box-item>
    `;
  };

  @eventOptions({ passive: true })
  private _onScrollSearchList(ev) {
    const top = ev.target.scrollTop ?? 0;
    this._searchListScrolled = top > 0;
  }

  @eventOptions({ passive: true })
  private _visibilityChanged(ev) {
    if (this._virtualizerElement) {
      const firstItem = this._virtualizerElement.items[ev.first];
      const secondItem = this._virtualizerElement.items[ev.first + 1];

      if (
        firstItem === undefined ||
        secondItem === undefined ||
        typeof firstItem === "string" ||
        typeof secondItem === "string" ||
        ev.first === 0 ||
        (ev.first === 0 &&
          ev.last === this._virtualizerElement.items.length - 1)
      ) {
        this._searchSectionTitle = undefined;
        return;
      }

      let section: SearchSection;

      if (
        (firstItem as AutomationItemComboBoxItem).type &&
        !["area", "floor"].includes(
          (firstItem as AutomationItemComboBoxItem).type
        )
      ) {
        section = (firstItem as AutomationItemComboBoxItem)
          .type as SearchSection;
      } else {
        section = getTargetComboBoxItemType(firstItem as any) as SearchSection;
      }

      this._searchSectionTitle = this._getSearchSectionLabel(section);
    }
  }

  private _keyFunction = (item: PickerComboBoxItem | string) =>
    typeof item === "string" ? item : item.id;

  private _createFuseIndex = (states, keys: FuseWeightedKey[]) =>
    Fuse.createIndex(keys, states);

  private _fuseIndexes = {
    area: memoizeOne((states: PickerComboBoxItem[]) =>
      this._createFuseIndex(states, areaFloorComboBoxKeys)
    ),
    entity: memoizeOne((states: PickerComboBoxItem[]) =>
      this._createFuseIndex(states, entityComboBoxKeys)
    ),
    device: memoizeOne((states: PickerComboBoxItem[]) =>
      this._createFuseIndex(states, deviceComboBoxKeys)
    ),
    label: memoizeOne((states: PickerComboBoxItem[]) =>
      this._createFuseIndex(states, labelComboBoxKeys)
    ),
    item: memoizeOne((states: PickerComboBoxItem[]) =>
      this._createFuseIndex(states, ITEM_SEARCH_KEYS)
    ),
    block: memoizeOne((states: PickerComboBoxItem[]) =>
      this._createFuseIndex(states, ITEM_SEARCH_KEYS)
    ),
  };

  private _getFilteredItems = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      localize: HomeAssistant["localize"],
      searchTerm: string,
      configEntryLookup: Record<string, ConfigEntry>,
      automationItems: AddAutomationElementListItem[],
      newTriggersAndConditions: boolean,
      selectedSection?: SearchSection
    ) => {
      const resultItems: (
        | string
        | FloorComboBoxItem
        | EntityComboBoxItem
        | PickerComboBoxItem
      )[] = [];

      if (!selectedSection || selectedSection === "item") {
        let items = this._convertItemsToComboBoxItems(automationItems, type);
        if (searchTerm) {
          items = this._filterGroup(
            "item",
            items,
            searchTerm,
            ITEM_SEARCH_KEYS
          ) as AutomationItemComboBoxItem[];
        }

        if (!selectedSection && items.length) {
          // show group title
          resultItems.push(
            localize(`ui.panel.config.automation.editor.${type}s.name`)
          );
        }

        resultItems.push(...items);
      }

      if (
        type !== "trigger" &&
        (!selectedSection || selectedSection === "block")
      ) {
        const groups =
          type === "action"
            ? ACTION_BUILDING_BLOCKS_GROUP
            : type === "condition"
              ? CONDITION_BUILDING_BLOCKS_GROUP
              : {};

        let blocks = this._convertItemsToComboBoxItems(
          Object.keys(groups).map((key) =>
            this.convertToItem(key, {}, type, localize)
          ),
          "block"
        );

        if (searchTerm) {
          blocks = this._filterGroup(
            "block",
            blocks,
            searchTerm,
            ITEM_SEARCH_KEYS
          ) as AutomationItemComboBoxItem[];
        }

        if (!selectedSection && blocks.length) {
          // show group title
          resultItems.push(
            localize("ui.panel.config.automation.editor.blocks")
          );
        }
        resultItems.push(...blocks);
      }

      if (newTriggersAndConditions) {
        if (!selectedSection || selectedSection === "entity") {
          let entityItems = this._getEntitiesMemoized(
            this.hass,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            `entity${TARGET_SEPARATOR}`
          );

          if (searchTerm) {
            entityItems = this._filterGroup(
              "entity",
              entityItems,
              searchTerm,
              entityComboBoxKeys
            ) as EntityComboBoxItem[];
          }

          if (!selectedSection && entityItems.length) {
            // show group title
            resultItems.push(
              localize("ui.components.target-picker.type.entities")
            );
          }

          resultItems.push(...entityItems);
        }

        if (!selectedSection || selectedSection === "device") {
          let deviceItems = this._getDevicesMemoized(
            this.hass,
            configEntryLookup,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            `device${TARGET_SEPARATOR}`
          );

          if (searchTerm) {
            deviceItems = this._filterGroup(
              "device",
              deviceItems,
              searchTerm,
              deviceComboBoxKeys
            );
          }

          if (!selectedSection && deviceItems.length) {
            // show group title
            resultItems.push(
              localize("ui.components.target-picker.type.devices")
            );
          }

          resultItems.push(...deviceItems);
        }

        if (!selectedSection || selectedSection === "area") {
          let areasAndFloors = this._getAreasAndFloorsMemoized(
            this.hass.states,
            this.hass.floors,
            this.hass.areas,
            this.hass.devices,
            this.hass.entities,
            memoizeOne((value: AreaFloorValue): string =>
              [value.type, value.id].join(TARGET_SEPARATOR)
            ),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined
          );

          if (searchTerm) {
            areasAndFloors = this._filterGroup(
              "area",
              areasAndFloors,
              searchTerm,
              areaFloorComboBoxKeys,
              false
            ) as FloorComboBoxItem[];
          }

          if (!selectedSection && areasAndFloors.length) {
            // show group title
            resultItems.push(
              localize("ui.components.target-picker.type.areas")
            );
          }

          resultItems.push(
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

        if (!selectedSection || selectedSection === "label") {
          let labels = this._getLabelsMemoized(
            this.hass.states,
            this.hass.areas,
            this.hass.devices,
            this.hass.entities,
            this._labelRegistry,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            `label${TARGET_SEPARATOR}`
          );

          if (searchTerm) {
            labels = this._filterGroup(
              "label",
              labels,
              searchTerm,
              labelComboBoxKeys
            );
          }

          if (!selectedSection && labels.length) {
            // show group title
            resultItems.push(
              localize("ui.components.target-picker.type.labels")
            );
          }

          resultItems.push(...labels);
        }
      }

      return resultItems;
    }
  );

  private _filterGroup(
    type: SearchSection,
    items: (
      | FloorComboBoxItem
      | PickerComboBoxItem
      | EntityComboBoxItem
      | AutomationItemComboBoxItem
    )[],
    searchTerm: string,
    searchKeys: FuseWeightedKey[],
    sort = true
  ) {
    const fuseIndex = this._fuseIndexes[type](items);

    if (sort) {
      return multiTermSortedSearch<PickerComboBoxItem>(
        items,
        searchTerm,
        searchKeys,
        (item) => item.id,
        fuseIndex
      );
    }

    return multiTermSearch<PickerComboBoxItem>(
      items,
      searchTerm,
      searchKeys,
      fuseIndex,
      { ignoreLocation: true }
    );
  }

  private _toggleSection(ev: Event) {
    ev.stopPropagation();
    // this._resetSelectedItem();
    this._searchSectionTitle = undefined;
    const section = (ev.target as HTMLElement)["section-id"] as string;
    if (!section) {
      return;
    }
    if (this._selectedSearchSection === section) {
      this._selectedSearchSection = undefined;
    } else {
      this._selectedSearchSection = section as SearchSection;
    }

    // Reset scroll position when filter changes
    if (this._virtualizerElement) {
      this._virtualizerElement.scrollToIndex(0);
    }
  }

  private _getSearchSectionLabel(section: SearchSection) {
    if (section === "block") {
      return this.hass.localize("ui.panel.config.automation.editor.blocks");
    }

    if (
      section === "item" ||
      ["trigger", "condition", "action"].includes(section)
    ) {
      return this.hass.localize(
        `ui.panel.config.automation.editor.${this.addElementType}s.name`
      );
    }

    return this.hass.localize(
      `ui.components.target-picker.type.${section === "entity" ? "entities" : `${section as "area" | "device" | "floor"}s`}` as LocalizeKeys
    );
  }

  private _convertItemsToComboBoxItems = (
    items: AddAutomationElementListItem[],
    type: "trigger" | "condition" | "action" | "block"
  ): AutomationItemComboBoxItem[] =>
    items.map(({ key, name, description, iconPath, icon }) => ({
      id: key,
      primary: name,
      secondary: description,
      icon_path: iconPath,
      renderedIcon: icon,
      type,
      search_labels: {
        key,
        name,
        description,
      },
    }));

  private _focusSearchList = () => {
    if (this._selectedSearchItemIndex === -1) {
      this._selectNextSearchItem();
    }
  };

  private _selectSearchResult = (ev: Event) => {
    ev.stopPropagation();
    const value = (ev.currentTarget as any).value as
      | PickerComboBoxItem
      | FloorComboBoxItem
      | EntityComboBoxItem
      | DevicePickerItem
      | AutomationItemComboBoxItem;

    if (!value) {
      return;
    }

    this._selectSearchItem(value);
  };

  private _resetSelectedSearchItem() {
    // TODO run on filter change!
    this._virtualizerElement
      ?.querySelector(".selected")
      ?.classList.remove("selected");
    this._selectedSearchItemIndex = -1;
  }

  private _selectNextSearchItem = (ev?: KeyboardEvent) => {
    ev?.stopPropagation();
    ev?.preventDefault();
    if (!this._virtualizerElement) {
      return;
    }

    const items = this._virtualizerElement.items as PickerComboBoxItem[];

    const maxItems = items.length - 1;

    if (maxItems === -1) {
      this._resetSelectedSearchItem();
      return;
    }

    const nextIndex =
      maxItems === this._selectedSearchItemIndex
        ? this._selectedSearchItemIndex
        : this._selectedSearchItemIndex + 1;

    if (!items[nextIndex]) {
      return;
    }

    if (typeof items[nextIndex] === "string") {
      // Skip titles, padding and empty search
      if (nextIndex === maxItems) {
        return;
      }
      this._selectedSearchItemIndex = nextIndex + 1;
    } else {
      this._selectedSearchItemIndex = nextIndex;
    }

    this._scrollToSelectedSearchItem();
  };

  private _scrollToSelectedSearchItem = () => {
    this._virtualizerElement
      ?.querySelector(".selected")
      ?.classList.remove("selected");

    this._virtualizerElement?.scrollToIndex(
      this._selectedSearchItemIndex,
      "end"
    );

    requestAnimationFrame(() => {
      this._virtualizerElement
        ?.querySelector(`#search-list-item-${this._selectedSearchItemIndex}`)
        ?.classList.add("selected");
    });
  };

  private _selectPreviousSearchItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
    if (!this._virtualizerElement) {
      return;
    }

    if (this._selectedSearchItemIndex > 0) {
      const nextIndex = this._selectedSearchItemIndex - 1;

      const items = this._virtualizerElement.items as PickerComboBoxItem[];

      if (!items[nextIndex]) {
        return;
      }

      if (typeof items[nextIndex] === "string") {
        // Skip titles, padding and empty search
        if (nextIndex === 0) {
          return;
        }
        this._selectedSearchItemIndex = nextIndex - 1;
      } else {
        this._selectedSearchItemIndex = nextIndex;
      }

      this._scrollToSelectedSearchItem();
    }
  };

  private _selectFirstSearchItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    if (!this._virtualizerElement || !this._virtualizerElement.items.length) {
      return;
    }

    const nextIndex = 0;

    if (typeof this._virtualizerElement.items[nextIndex] === "string") {
      this._selectedSearchItemIndex = nextIndex + 1;
    } else {
      this._selectedSearchItemIndex = nextIndex;
    }

    this._scrollToSelectedSearchItem();
  };

  private _selectLastSearchItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    if (!this._virtualizerElement || !this._virtualizerElement.items.length) {
      return;
    }

    const nextIndex = this._virtualizerElement.items.length - 1;

    if (typeof this._virtualizerElement.items[nextIndex] === "string") {
      this._selectedSearchItemIndex = nextIndex - 1;
    } else {
      this._selectedSearchItemIndex = nextIndex;
    }

    this._scrollToSelectedSearchItem();
  };

  private _pickSelectedSearchItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();

    const filteredItems = this._virtualizerElement?.items.filter(
      (item) => typeof item !== "string"
    );

    if (filteredItems && filteredItems.length === 1) {
      const firstItem = filteredItems[0] as PickerComboBoxItem;

      this._selectSearchItem(firstItem as PickerComboBoxItem);
      return;
    }

    if (this._selectedSearchItemIndex === -1) {
      return;
    }

    // if filter button is focused
    ev.preventDefault();

    const item = this._virtualizerElement?.items[
      this._selectedSearchItemIndex
    ] as PickerComboBoxItem;
    if (item) {
      this._selectSearchItem(item);
    }
  };

  private _selectSearchItem(
    item:
      | PickerComboBoxItem
      | FloorComboBoxItem
      | EntityComboBoxItem
      | DevicePickerItem
      | AutomationItemComboBoxItem
  ) {
    fireEvent(this, "search-element-picked", item);
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
    }
    .empty-search {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: var(--ha-space-3);
      border-radius: var(--ha-border-radius-xl);
      background-color: var(--ha-color-surface-default);
      align-items: center;
      color: var(--ha-color-text-secondary);
      margin: var(--ha-space-3) var(--ha-space-4)
        max(var(--safe-area-inset-bottom), var(--ha-space-3));
      line-height: var(--ha-line-height-expanded);
      padding-top: var(--ha-space-6);
      justify-content: start;
    }

    .sections {
      display: flex;
      flex-wrap: nowrap;
      gap: var(--ha-space-2);
      padding: var(--ha-space-3);
      margin-bottom: calc(var(--ha-space-3) * -1);
      overflow: auto;
      overflow-x: auto;
      overflow-y: hidden;
    }

    .sections ha-filter-chip {
      flex-shrink: 0;
      --md-filter-chip-selected-container-color: var(
        --ha-color-fill-primary-normal-hover
      );
      color: var(--primary-color);
    }

    .sections .separator {
      height: var(--ha-space-8);
      width: 0;
      border: 1px solid var(--ha-color-border-neutral-quiet);
    }

    .search-results {
      border-radius: var(--ha-border-radius-xl);
      border: 1px solid var(--ha-color-border-neutral-quiet);
      margin: var(--ha-space-3);
      overflow: hidden;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    lit-virtualizer ha-section-title {
      width: 100%;
    }

    lit-virtualizer {
      flex: 1;
    }

    lit-virtualizer:focus-visible {
      outline: none;
    }

    ha-combo-box-item {
      width: 100%;
    }

    ha-combo-box-item.selected {
      background-color: var(--ha-color-fill-neutral-quiet-hover);
    }

    @media (prefers-color-scheme: dark) {
      ha-combo-box-item.selected {
        background-color: var(--ha-color-fill-neutral-normal-hover);
      }
    }

    ha-svg-icon.plus {
      color: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-add-search": HaAutomationAddSearch;
  }

  interface HASSDomEvents {
    "search-element-picked":
      | PickerComboBoxItem
      | FloorComboBoxItem
      | EntityComboBoxItem;
  }
}
