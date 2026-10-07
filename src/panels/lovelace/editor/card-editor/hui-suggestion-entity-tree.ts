import {
  mdiChevronDown,
  mdiChevronLeft,
  mdiChevronRight,
  mdiMagnify,
  mdiTextureBox,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { tinykeys } from "tinykeys";
import { consume } from "../../../../common/decorators/consume";
import { transform } from "../../../../common/decorators/transform";
import { fireEvent } from "../../../../common/dom/fire_event";
import { mainWindow } from "../../../../common/dom/get_main_window";
import { computeEntityName } from "../../../../common/entity/compute_entity_name";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { ignoreRepeatedActivation } from "../../../../common/keyboard/ignore-repeated-activation";
import { computeRTL } from "../../../../common/util/compute_rtl";
import { debounce } from "../../../../common/util/debounce";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-combo-box-item";
import "../../../../components/ha-domain-icon";
import "../../../../components/ha-floor-icon";
import "../../../../components/ha-icon";
import "../../../../components/ha-section-title";
import "../../../../components/ha-svg-icon";
import "../../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../../components/input/ha-input-search";
import "../../../../components/item/ha-list-item-button";
import "../../../../components/list/ha-list-base";
import type { HaListBase } from "../../../../components/list/ha-list-base";
import "../../../../components/list/ha-list-virtualized";
import type { HaListVirtualizedItem } from "../../../../components/list/ha-list-virtualized";
import type { ConfigEntry } from "../../../../data/config_entries";
import { configEntriesContext } from "../../../../data/context";
import { haStyleScrollbar } from "../../../../resources/styles";
import { loadVirtualizer } from "../../../../resources/virtualizer";
import type { HomeAssistant } from "../../../../types";
import type {
  AreaNode,
  DeviceNode,
  DomainGroup,
  EntityFuseIndex,
  EntityTree,
  FloorNode,
  SearchableEntity,
  UnassignedSection,
} from "./entity-tree-builder";
import {
  areaKey,
  buildEntityTree,
  buildSearchIndex,
  childKeyPrefix,
  deviceKey,
  domainKey,
  floorKey,
  OTHER_AREAS_ID,
  pathToEntity,
  searchEntities,
  unassignedKey,
} from "./entity-tree-builder";

interface SearchRow extends HaListVirtualizedItem {
  item: SearchableEntity;
}

// Search results render in the list's shadow root, out of reach of the
// `.entity-item.selected` rule, so the selected row is styled inline.
const SELECTED_SEARCH_ROW_STYLE = {
  backgroundColor:
    "var(--ha-color-fill-primary-quiet-resting, rgba(var(--rgb-primary-color, 33, 150, 243), 0.12))",
  "--ha-combo-box-item-headline-color": "var(--primary-color)",
  "--ha-combo-box-item-headline-font-weight": "var(--ha-font-weight-medium)",
};

@customElement("hui-suggestion-entity-tree")
export class HuiSuggestionEntityTree extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selectedEntityId?: string;

  @state() private _filter = "";

  @state() private _expanded: Record<string, boolean> = {};

  @state()
  @consume({ context: configEntriesContext, subscribe: true })
  @transform<ConfigEntry[], Record<string, ConfigEntry>>({
    transformer: (value) =>
      value
        ? Object.fromEntries(value.map((entry) => [entry.entry_id, entry]))
        : undefined,
  })
  private _configEntryLookup?: Record<string, ConfigEntry>;

  // Captured from the load promise to avoid racing parent hass propagation.
  @state() private _domainLocalize?: HomeAssistant["localize"];

  // Built once; rebuilding the structure and Fuse index on each hass tick
  // would freeze the picker on large registries.
  @state() private _tree?: EntityTree;

  @state() private _fuseIndex?: EntityFuseIndex;

  @query("ha-input-search") private _searchInput?: HaInputSearch;

  @query(".list") private _list?: HaListBase;

  private _removeKeyboardShortcuts?: () => void;

  public async focus(): Promise<void> {
    await this.updateComplete;
    // Wait for the input's inner wa-input to render so focus delegation works.
    await this._searchInput?.updateComplete;
    this._searchInput?.focus();
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._loadDomainTranslations();
    this._removeKeyboardShortcuts = tinykeys(
      this,
      {
        ArrowUp: this._selectPreviousItem,
        ArrowDown: this._selectNextItem,
        Home: this._selectFirstItem,
        End: this._selectLastItem,
        PageUp: this._selectPreviousPage,
        PageDown: this._selectNextPage,
        Enter: this._activateSelectedItem,
      },
      // Held arrow keys keep moving, like in lists.
      { ignore: ignoreRepeatedActivation }
    );
  }

  private async _loadDomainTranslations() {
    if (!this.hass) return;
    this._domainLocalize = await this.hass.loadBackendTranslation("title");
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._setFilter.cancel();
    this._removeKeyboardShortcuts?.();
    this._removeKeyboardShortcuts = undefined;
  }

  private _deviceDomain(deviceId: string): string | undefined {
    const device = this.hass?.devices[deviceId];
    if (!device?.primary_config_entry) return undefined;
    return this._configEntryLookup?.[device.primary_config_entry]?.domain;
  }

  private _searchMemo = memoizeOne(searchEntities);

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (!this.hasUpdated) {
      loadVirtualizer();
    }
    if (!this._tree && this.hass && this._domainLocalize) {
      this._tree = buildEntityTree({
        states: this.hass.states,
        entities: this.hass.entities,
        devices: this.hass.devices,
        areas: this.hass.areas,
        floors: this.hass.floors,
        language: this.hass.locale?.language,
        localize: this._domainLocalize,
      });
      this._fuseIndex = buildSearchIndex(this._tree.searchableEntities);
      // With a single real floor, save users an extra click and expand it.
      // Other-areas (when present) stays collapsed since it's a real choice.
      if (this._tree.floors.length === 1) {
        this._expanded = {
          [floorKey(this._tree.floors[0].id)]: true,
        };
      }
    }
  }

  protected render() {
    if (!this.hass) return nothing;

    return html`
      <ha-input-search
        appearance="outlined"
        .value=${this._filter}
        .placeholder=${this.hass.localize(
          "ui.panel.lovelace.editor.cardpicker.search_entities"
        )}
        @input=${this._handleFilterChange}
      ></ha-input-search>
      ${
        this._tree
          ? this._filter
            ? this._renderSearchResults()
            : html`<ha-list-base
                class="list tree ha-scrollbar"
                virtual-focus
                tabindex="0"
                @focus=${this._focusList}
                @blur=${this._resetActiveItem}
              >
                ${this._renderTree(this._tree)}
              </ha-list-base>`
          : nothing
      }
    `;
  }

  private _isExpanded(key: string): boolean {
    return this._expanded[key] ?? false;
  }

  private _renderTree(tree: EntityTree): TemplateResult {
    // With no real floors, drop the synthetic "other areas" wrapper and
    // surface areas as roots so users don't see a meaningless single group.
    const otherAreasAsRoot =
      tree.floors.length === 0 && tree.otherAreas.length > 0;
    return html`
      ${
        tree.floors.length || tree.otherAreas.length
          ? html`
              <ha-section-title>
                ${this.hass.localize("ui.panel.lovelace.editor.cardpicker.home")}
              </ha-section-title>
              ${repeat(
                tree.floors,
                (floor: FloorNode) => floor.id,
                (floor: FloorNode) => this._renderFloor(floor, false)
              )}
              ${
                tree.otherAreas.length
                  ? otherAreasAsRoot
                    ? repeat(
                        tree.otherAreas,
                        (area: AreaNode) => area.id,
                        (area: AreaNode) =>
                          this._renderArea(area, floorKey(OTHER_AREAS_ID))
                      )
                    : this._renderFloor(
                        {
                          id: OTHER_AREAS_ID,
                          name: this.hass.localize(
                            "ui.panel.lovelace.editor.cardpicker.other_areas"
                          ),
                          icon: null,
                          level: null,
                          areas: tree.otherAreas,
                        },
                        true
                      )
                  : nothing
              }
            `
          : nothing
      }
      ${
        tree.unassignedSections.length
          ? html`
              <ha-section-title>
                ${this.hass.localize(
                  "ui.panel.lovelace.editor.cardpicker.unassigned"
                )}
              </ha-section-title>
              ${repeat(
                tree.unassignedSections,
                (section: UnassignedSection) => section.id,
                (section: UnassignedSection) =>
                  this._renderUnassignedSection(section)
              )}
            `
          : nothing
      }
    `;
  }

  private _getSearchRows = memoizeOne(
    (results: SearchableEntity[]): SearchRow[] =>
      results.map((item) => ({ id: item.id, interactive: true, item }))
  );

  private _renderSearchResults(): TemplateResult {
    const results = this._searchMemo(
      this._tree!.searchableEntities,
      this._fuseIndex!,
      this._filter
    );
    if (!results.length) {
      return html`
        <div class="empty">
          <ha-svg-icon .path=${mdiMagnify}></ha-svg-icon>
          <h2>
            ${this.hass.localize(
              "ui.panel.lovelace.editor.cardpicker.no_search_results_title"
            )}
          </h2>
          <p>
            ${this.hass.localize(
              "ui.panel.lovelace.editor.cardpicker.no_search_results_description"
            )}
          </p>
        </div>
      `;
    }
    return html`
      <ha-list-virtualized
        class="list search-results"
        virtual-focus
        tabindex="0"
        .rows=${this._getSearchRows(results)}
        .rowRenderer=${this._getSearchRowRenderer(this.selectedEntityId)}
        @focus=${this._focusList}
        @blur=${this._resetActiveItem}
      ></ha-list-virtualized>
    `;
  }

  private _getSearchRowRenderer = memoizeOne(
    (_selectedEntityId: string | undefined) =>
      (row: HaListVirtualizedItem, index: number) =>
        this._renderSearchRow((row as SearchRow).item, index)
  );

  private _renderSearchRow = (
    item: SearchableEntity,
    index: number
  ): TemplateResult => {
    const stateObj = this.hass.states[item.id];
    const selected = this.selectedEntityId === item.id;
    const rtl = computeRTL(
      this.hass.language,
      this.hass.translationMetadata.translations
    );
    const separator = rtl ? " ◂ " : " ▸ ";
    const secondary = [item.area, item.parentDevice, item.device]
      .filter(Boolean)
      .join(separator);
    return html`
      <ha-list-item-button
        aria-current=${selected ? "true" : "false"}
        data-entity-id=${item.id}
        @click=${this._pickEntity}
      >
        <ha-combo-box-item
          slot="content"
          .borderTop=${index !== 0}
          style=${styleMap(selected ? SELECTED_SEARCH_ROW_STYLE : {})}
        >
          ${
            stateObj
              ? html`<state-badge
                  slot="start"
                  .stateObj=${stateObj}
                ></state-badge>`
              : nothing
          }
          <span slot="headline">${item.name}</span>
          ${
            secondary
              ? html`<span slot="supporting-text">${secondary}</span>`
              : nothing
          }
          ${
            item.domain
              ? html`<div slot="trailing-supporting-text" class="domain">
                  ${item.domain}
                </div>`
              : nothing
          }
        </ha-combo-box-item>
      </ha-list-item-button>
    `;
  };

  private _renderChevron(expanded: boolean): TemplateResult {
    return html`<ha-svg-icon
      class="chevron"
      .path=${
        expanded
          ? mdiChevronDown
          : mainWindow.document.dir === "rtl"
            ? mdiChevronLeft
            : mdiChevronRight
      }
    ></ha-svg-icon>`;
  }

  private _renderFloor(
    floor: FloorNode,
    isUnassigned: boolean
  ): TemplateResult {
    const key = floorKey(floor.id);
    const expanded = this._isExpanded(key);
    return html`
      <ha-list-item-button
        aria-expanded=${expanded}
        data-node-key=${key}
        @click=${this._toggleNode}
      >
        <ha-combo-box-item slot="content" class="branch depth-root floor-item">
          <div slot="start" class="leading">
            ${this._renderChevron(expanded)}
            ${
              isUnassigned
                ? html`<ha-svg-icon .path=${mdiTextureBox}></ha-svg-icon>`
                : html`<ha-floor-icon
                    .floor=${{ icon: floor.icon, level: floor.level }}
                  ></ha-floor-icon>`
            }
          </div>
          <span slot="headline">${floor.name}</span>
        </ha-combo-box-item>
      </ha-list-item-button>
      ${
        expanded
          ? repeat(
              floor.areas,
              (area: AreaNode) => area.id,
              (area: AreaNode) => this._renderArea(area, key)
            )
          : nothing
      }
    `;
  }

  private _renderArea(area: AreaNode, parentKey: string): TemplateResult {
    const key = areaKey(parentKey, area.id);
    const expanded = this._isExpanded(key);
    return html`
      <ha-list-item-button
        aria-expanded=${expanded}
        data-node-key=${key}
        @click=${this._toggleNode}
      >
        <ha-combo-box-item slot="content" class="branch depth-area area-item">
          <div slot="start" class="leading">
            ${this._renderChevron(expanded)}
            ${
              area.icon
                ? html`<ha-icon .icon=${area.icon}></ha-icon>`
                : html`<ha-svg-icon .path=${mdiTextureBox}></ha-svg-icon>`
            }
          </div>
          <span slot="headline">${area.name}</span>
        </ha-combo-box-item>
      </ha-list-item-button>
      ${
        expanded
          ? html`
              ${repeat(
                area.devices,
                (device: DeviceNode) => device.id,
                (device: DeviceNode) => this._renderDevice(device, key)
              )}
              ${repeat(
                area.directEntityIds,
                (id: string) => id,
                (id: string) => this._renderEntity(id, "depth-entity-area")
              )}
            `
          : nothing
      }
    `;
  }

  private _renderDevice(
    device: DeviceNode,
    parentKey: string,
    nested = false
  ): TemplateResult {
    const key = deviceKey(parentKey, device.id);
    const expanded = this._isExpanded(key);
    const domain = this._deviceDomain(device.id);
    return html`
      <ha-list-item-button
        aria-expanded=${expanded}
        data-node-key=${key}
        @click=${this._toggleNode}
      >
        <ha-combo-box-item
          slot="content"
          class="branch ${nested ? "depth-device-nested" : "depth-device"} device-item"
        >
          <div slot="start" class="leading">
            ${this._renderChevron(expanded)}
            ${
              domain
                ? html`<ha-domain-icon
                    .hass=${this.hass}
                    .domain=${domain}
                    brand-fallback
                  ></ha-domain-icon>`
                : html`<ha-svg-icon .path=${mdiTextureBox}></ha-svg-icon>`
            }
          </div>
          <span slot="headline">${device.name}</span>
        </ha-combo-box-item>
      </ha-list-item-button>
      ${
        expanded
          ? html`
              ${repeat(
                device.children,
                (child: DeviceNode) => child.id,
                (child: DeviceNode) => this._renderDevice(child, key, true)
              )}
              ${repeat(
                device.entityIds,
                (id: string) => id,
                (id: string) =>
                  this._renderEntity(
                    id,
                    nested
                      ? "depth-entity-device-nested"
                      : "depth-entity-device"
                  )
              )}
            `
          : nothing
      }
    `;
  }

  private _renderUnassignedSection(section: UnassignedSection): TemplateResult {
    const key = unassignedKey(section.id);
    const expanded = this._isExpanded(key);
    return html`
      <ha-list-item-button
        aria-expanded=${expanded}
        data-node-key=${key}
        @click=${this._toggleNode}
      >
        <ha-combo-box-item slot="content" class="branch depth-root floor-item">
          <div slot="start" class="leading">
            ${this._renderChevron(expanded)}
            <ha-svg-icon .path=${section.iconPath}></ha-svg-icon>
          </div>
          <span slot="headline">${section.label}</span>
        </ha-combo-box-item>
      </ha-list-item-button>
      ${
        expanded
          ? html`
              ${
                section.devices
                  ? repeat(
                      section.devices,
                      (device: DeviceNode) => device.id,
                      (device: DeviceNode) => this._renderDevice(device, key)
                    )
                  : nothing
              }
              ${
                section.domains
                  ? repeat(
                      section.domains,
                      (g: DomainGroup) => g.domain,
                      (g: DomainGroup) => {
                        const dKey = domainKey(key, g.domain);
                        const dExpanded = this._isExpanded(dKey);
                        return html`
                          <ha-list-item-button
                            aria-expanded=${dExpanded}
                            data-node-key=${dKey}
                            @click=${this._toggleNode}
                          >
                            <ha-combo-box-item
                              slot="content"
                              class="branch depth-area area-item"
                            >
                              <div slot="start" class="leading">
                                ${this._renderChevron(dExpanded)}
                                <ha-domain-icon
                                  .hass=${this.hass}
                                  .domain=${g.domain}
                                  brand-fallback
                                ></ha-domain-icon>
                              </div>
                              <span slot="headline">${g.name}</span>
                            </ha-combo-box-item>
                          </ha-list-item-button>
                          ${
                            dExpanded
                              ? repeat(
                                  g.entityIds,
                                  (id: string) => id,
                                  (id: string) =>
                                    this._renderEntity(id, "depth-entity-area")
                                )
                              : nothing
                          }
                        `;
                      }
                    )
                  : nothing
              }
            `
          : nothing
      }
    `;
  }

  private _renderEntity(entityId: string, depthClass: string): TemplateResult {
    const stateObj = this.hass.states[entityId];
    const selected = this.selectedEntityId === entityId;
    const entityName = stateObj
      ? computeEntityName(stateObj, this.hass.entities, this.hass.devices)
      : undefined;
    const name =
      entityName ||
      (stateObj ? computeStateName(stateObj) : undefined) ||
      entityId;
    return html`
      <ha-list-item-button
        aria-current=${selected ? "true" : "false"}
        data-entity-id=${entityId}
        @click=${this._pickEntity}
      >
        <ha-combo-box-item
          slot="content"
          class="leaf ${depthClass} entity-item ${selected ? "selected" : ""}"
        >
          <div slot="start" class="leading">
            <span class="chevron-spacer"></span>
            ${
              stateObj
                ? html`<state-badge .stateObj=${stateObj}></state-badge>`
                : nothing
            }
          </div>
          <span slot="headline">${name}</span>
        </ha-combo-box-item>
      </ha-list-item-button>
    `;
  }

  private _toggleNode(ev: Event) {
    const target = ev.currentTarget as HTMLElement;
    const key = target.dataset.nodeKey;
    if (!key) return;
    if (this._expanded[key]) {
      const next = { ...this._expanded };
      delete next[key];
      const prefix = childKeyPrefix(key);
      for (const k of Object.keys(next)) {
        if (k.startsWith(prefix)) delete next[k];
      }
      this._expanded = next;
    } else {
      this._expanded = { ...this._expanded, [key]: true };
    }
  }

  private _pickEntity = (ev: Event) => {
    const target = ev.currentTarget as HTMLElement;
    const entityId = target.dataset.entityId;
    if (!entityId) return;
    this._expandToEntity(entityId);
    fireEvent(this, "entity-picked", { entityId });
  };

  private _expandToEntity(entityId: string) {
    if (!this._tree) return;
    const path = pathToEntity(this._tree, entityId);
    if (!path.length) return;
    const next = { ...this._expanded };
    let changed = false;
    for (const key of path) {
      if (!next[key]) {
        next[key] = true;
        changed = true;
      }
    }
    if (changed) this._expanded = next;
  }

  private _focusList() {
    // A click focuses the list too. Only mark a row when the focus came from
    // the keyboard, so the clicked row is not preceded by the first one.
    if (!this._list?.matches(":focus-visible")) {
      return;
    }
    if (this._list.getActiveItemIndex() === -1) {
      this._list.moveActiveItem("next");
    }
  }

  private _resetActiveItem() {
    this._list?.clearActiveItem();
  }

  private _selectNextItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
    this._list?.moveActiveItem("next");
  };

  private _selectPreviousItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
    this._list?.moveActiveItem("previous");
  };

  private _selectFirstItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    this._list?.moveActiveItem("first");
  };

  private _selectLastItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    this._list?.moveActiveItem("last");
  };

  private _selectNextPage = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
    this._list?.moveActiveItem("next-page");
  };

  private _selectPreviousPage = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
    this._list?.moveActiveItem("previous-page");
  };

  private _activateSelectedItem = (ev: KeyboardEvent) => {
    const index = this._list?.getActiveItemIndex() ?? -1;
    if (index === -1) {
      return;
    }
    ev.stopPropagation();
    ev.preventDefault();

    if (!this._filter) {
      this._list!.items[index]?.activate();
      return;
    }

    // Search rows are virtualized, so resolve the entity from the results.
    const results = this._searchMemo(
      this._tree!.searchableEntities,
      this._fuseIndex!,
      this._filter
    );
    const entityId = results[index]?.id;
    if (entityId) {
      this._expandToEntity(entityId);
      fireEvent(this, "entity-picked", { entityId });
    }
  };

  private _handleFilterChange(ev: Event) {
    this._setFilter((ev.target as HaInputSearch).value ?? "");
  }

  private _setFilter = debounce((value: string) => {
    this._filter = value;
  }, 150);

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      css`
        :host {
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        ha-input-search {
          padding: var(--ha-space-3);
          border-bottom: var(--ha-border-width-sm) solid var(--divider-color);
        }
        .tree {
          overflow: auto;
        }
        .list:focus-visible {
          outline: none;
        }
        /* Search results render in the list's shadow root, so rows are
           styled through inherited custom properties. */
        .tree,
        .search-results {
          flex: 1;
          min-height: 0;
          padding-bottom: var(--ha-space-3);
          --ha-row-item-padding-block: 0;
          --ha-row-item-padding-inline: 0;
          --ha-row-item-gap: 0;
          --ha-row-item-min-height: 0;
          --ha-combo-box-item-min-height: 40px;
          --ha-combo-box-item-two-line-min-height: 48px;
          --ha-combo-box-item-padding-inline-start: var(--ha-space-3);
          --ha-combo-box-item-padding-inline-end: var(--ha-space-3);
        }
        ha-combo-box-item.depth-area {
          --ha-combo-box-item-padding-inline-start: var(--ha-space-8);
        }
        ha-combo-box-item.depth-device {
          --ha-combo-box-item-padding-inline-start: var(--ha-space-12);
        }
        ha-combo-box-item.depth-entity-area {
          --ha-combo-box-item-padding-inline-start: var(--ha-space-12);
        }
        ha-combo-box-item.depth-entity-device,
        ha-combo-box-item.depth-device-nested {
          --ha-combo-box-item-padding-inline-start: var(--ha-space-16);
        }
        ha-combo-box-item.depth-entity-device-nested {
          --ha-combo-box-item-padding-inline-start: var(--ha-space-20);
        }
        .leading {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
        }
        .leading ha-svg-icon,
        .leading ha-icon,
        .leading ha-floor-icon,
        .leading ha-domain-icon {
          color: var(--secondary-text-color);
        }
        .leading state-badge {
          --state-icon-color: var(--secondary-text-color);
          width: 24px;
          height: 24px;
        }
        .chevron {
          color: var(--secondary-text-color);
          flex: 0 0 24px;
        }
        .chevron-spacer {
          width: 24px;
          flex: 0 0 24px;
        }
        .floor-item {
          --ha-combo-box-item-headline-font-weight: var(
            --ha-font-weight-medium
          );
        }
        .entity-item.selected {
          background-color: var(
            --ha-color-fill-primary-quiet-resting,
            rgba(var(--rgb-primary-color, 33, 150, 243), 0.12)
          );
          --ha-combo-box-item-headline-color: var(--primary-color);
          --ha-combo-box-item-headline-font-weight: var(
            --ha-font-weight-medium
          );
        }
        .entity-item.selected .leading state-badge {
          --state-icon-color: var(--primary-color);
        }
        .empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--ha-space-2);
          padding: var(--ha-space-8) var(--ha-space-4);
          text-align: center;
        }
        .empty ha-svg-icon {
          --mdc-icon-size: 32px;
          color: var(--ha-color-text-secondary);
        }
        .empty h2 {
          margin: 0;
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-medium);
          color: var(--primary-text-color);
        }
        .empty p {
          margin: 0;
          color: var(--ha-color-text-secondary);
          font-size: var(--ha-font-size-s);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-suggestion-entity-tree": HuiSuggestionEntityTree;
  }
  interface HASSDomEvents {
    "entity-picked": { entityId: string };
  }
}
