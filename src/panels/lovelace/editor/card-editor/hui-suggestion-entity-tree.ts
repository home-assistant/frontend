import { mdiChevronDown, mdiChevronRight, mdiTextureBox } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeEntityName } from "../../../../common/entity/compute_entity_name";
import { computeStateName } from "../../../../common/entity/compute_state_name";
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
import type { ConfigEntry } from "../../../../data/config_entries";
import { getConfigEntries } from "../../../../data/config_entries";
import { haStyleScrollbar } from "../../../../resources/styles";
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

declare global {
  interface HASSDomEvents {
    "entity-picked": { entityId: string };
  }
}

@customElement("hui-suggestion-entity-tree")
export class HuiSuggestionEntityTree extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selectedEntityId?: string;

  @state() private _filter = "";

  @state() private _expanded: Record<string, boolean> = {};

  @state() private _configEntryLookup: Record<string, ConfigEntry> = {};

  // Captured from the load promise to avoid racing parent hass propagation.
  @state() private _domainLocalize?: HomeAssistant["localize"];

  // Built once; rebuilding the structure and Fuse index on each hass tick
  // would freeze the picker on large registries.
  @state() private _tree?: EntityTree;

  @state() private _fuseIndex?: EntityFuseIndex;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass && !Object.keys(this._configEntryLookup).length) {
      this._loadConfigEntries();
    }
    this._loadDomainTranslations();
  }

  // Backend "title" category is loaded by the config panel — not from the dashboard.
  private async _loadDomainTranslations() {
    if (!this.hass) return;
    this._domainLocalize = await this.hass.loadBackendTranslation("title");
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._setFilter.cancel();
  }

  private async _loadConfigEntries() {
    if (!this.hass) return;
    try {
      const entries = await getConfigEntries(this.hass);
      const lookup: Record<string, ConfigEntry> = {};
      for (const entry of entries) {
        lookup[entry.entry_id] = entry;
      }
      this._configEntryLookup = lookup;
    } catch (_err) {
      // Device rows will fall back to a generic icon
    }
  }

  private _deviceDomain(deviceId: string): string | undefined {
    const device = this.hass?.devices[deviceId];
    if (!device?.primary_config_entry) return undefined;
    return this._configEntryLookup[device.primary_config_entry]?.domain;
  }

  private _searchMemo = memoizeOne(searchEntities);

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (!this._tree && this.hass && this._domainLocalize) {
      this._tree = buildEntityTree(this.hass, this._domainLocalize);
      this._fuseIndex = buildSearchIndex(this._tree.searchableEntities);
    }
  }

  protected render() {
    if (!this.hass || !this._tree) return nothing;

    return html`
      <ha-input-search
        appearance="outlined"
        .value=${this._filter}
        .placeholder=${this.hass.localize(
          "ui.panel.lovelace.editor.cardpicker.search_entities"
        )}
        @input=${this._handleFilterChange}
      ></ha-input-search>
      <div class="tree ha-scrollbar">
        ${this._filter
          ? this._renderSearchResults()
          : this._renderTree(this._tree)}
      </div>
    `;
  }

  private _isExpanded(key: string): boolean {
    return this._expanded[key] ?? false;
  }

  private _renderTree(tree: EntityTree): TemplateResult {
    return html`
      ${tree.floors.length || tree.otherAreas.length
        ? html`
            <ha-section-title>
              ${this.hass.localize("ui.panel.lovelace.editor.cardpicker.home")}
            </ha-section-title>
            ${repeat(
              tree.floors,
              (floor: FloorNode) => floor.id,
              (floor: FloorNode) => this._renderFloor(floor, false)
            )}
            ${tree.otherAreas.length
              ? this._renderFloor(
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
              : nothing}
          `
        : nothing}
      ${tree.unassignedSections.length
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
        : nothing}
    `;
  }

  private _renderSearchResults(): TemplateResult {
    const results = this._searchMemo(
      this._tree!.searchableEntities,
      this._fuseIndex!,
      this._filter
    );
    if (!results.length) {
      return html`
        <div class="empty">${this.hass.localize("ui.common.no_results")}</div>
      `;
    }
    const rtl = computeRTL(
      this.hass.language,
      this.hass.translationMetadata.translations
    );
    const separator = rtl ? " ◂ " : " ▸ ";
    return html`
      ${repeat(
        results,
        (item: SearchableEntity) => item.id,
        (item: SearchableEntity, index: number) =>
          this._renderSearchRow(item, index, separator)
      )}
    `;
  }

  private _renderSearchRow(
    item: SearchableEntity,
    index: number,
    separator: string
  ): TemplateResult {
    const stateObj = this.hass.states[item.id];
    const selected = this.selectedEntityId === item.id;
    const secondary = [item.area, item.device].filter(Boolean).join(separator);
    return html`
      <ha-combo-box-item
        type="button"
        compact
        .borderTop=${index !== 0}
        class="entity-item ${selected ? "selected" : ""}"
        aria-current=${selected ? "true" : "false"}
        data-entity-id=${item.id}
        @click=${this._pickEntity}
      >
        ${stateObj
          ? html`<state-badge
              slot="start"
              .hass=${this.hass}
              .stateObj=${stateObj}
            ></state-badge>`
          : nothing}
        <span slot="headline">${item.name}</span>
        ${secondary
          ? html`<span slot="supporting-text">${secondary}</span>`
          : nothing}
        ${item.domain
          ? html`<div slot="trailing-supporting-text" class="domain">
              ${item.domain}
            </div>`
          : nothing}
      </ha-combo-box-item>
    `;
  }

  private _renderChevron(expanded: boolean): TemplateResult {
    return html`<ha-svg-icon
      class="chevron"
      .path=${expanded ? mdiChevronDown : mdiChevronRight}
    ></ha-svg-icon>`;
  }

  private _renderFloor(
    floor: FloorNode,
    isUnassigned: boolean
  ): TemplateResult {
    const key = floorKey(floor.id);
    const expanded = this._isExpanded(key);
    return html`
      <ha-combo-box-item
        type="button"
        class="branch depth-root floor-item"
        aria-expanded=${expanded}
        data-node-key=${key}
        @click=${this._toggleNode}
      >
        <div slot="start" class="leading">
          ${this._renderChevron(expanded)}
          ${isUnassigned
            ? html`<ha-svg-icon .path=${mdiTextureBox}></ha-svg-icon>`
            : html`<ha-floor-icon
                .floor=${{ icon: floor.icon, level: floor.level }}
              ></ha-floor-icon>`}
        </div>
        <span slot="headline">${floor.name}</span>
      </ha-combo-box-item>
      ${expanded
        ? repeat(
            floor.areas,
            (area: AreaNode) => area.id,
            (area: AreaNode) => this._renderArea(area, key)
          )
        : nothing}
    `;
  }

  private _renderArea(area: AreaNode, parentKey: string): TemplateResult {
    const key = areaKey(parentKey, area.id);
    const expanded = this._isExpanded(key);
    return html`
      <ha-combo-box-item
        type="button"
        class="branch depth-area area-item"
        aria-expanded=${expanded}
        data-node-key=${key}
        @click=${this._toggleNode}
      >
        <div slot="start" class="leading">
          ${this._renderChevron(expanded)}
          ${area.icon
            ? html`<ha-icon .icon=${area.icon}></ha-icon>`
            : html`<ha-svg-icon .path=${mdiTextureBox}></ha-svg-icon>`}
        </div>
        <span slot="headline">${area.name}</span>
      </ha-combo-box-item>
      ${expanded
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
        : nothing}
    `;
  }

  private _renderDevice(device: DeviceNode, parentKey: string): TemplateResult {
    const key = deviceKey(parentKey, device.id);
    const expanded = this._isExpanded(key);
    const domain = this._deviceDomain(device.id);
    return html`
      <ha-combo-box-item
        type="button"
        class="branch depth-device device-item"
        aria-expanded=${expanded}
        data-node-key=${key}
        @click=${this._toggleNode}
      >
        <div slot="start" class="leading">
          ${this._renderChevron(expanded)}
          ${domain
            ? html`<ha-domain-icon
                .hass=${this.hass}
                .domain=${domain}
                brand-fallback
              ></ha-domain-icon>`
            : html`<ha-svg-icon .path=${mdiTextureBox}></ha-svg-icon>`}
        </div>
        <span slot="headline">${device.name}</span>
      </ha-combo-box-item>
      ${expanded
        ? repeat(
            device.entityIds,
            (id: string) => id,
            (id: string) => this._renderEntity(id, "depth-entity-device")
          )
        : nothing}
    `;
  }

  private _renderUnassignedSection(section: UnassignedSection): TemplateResult {
    const key = unassignedKey(section.id);
    const expanded = this._isExpanded(key);
    return html`
      <ha-combo-box-item
        type="button"
        class="branch depth-root floor-item"
        aria-expanded=${expanded}
        data-node-key=${key}
        @click=${this._toggleNode}
      >
        <div slot="start" class="leading">
          ${this._renderChevron(expanded)}
          <ha-svg-icon .path=${section.iconPath}></ha-svg-icon>
        </div>
        <span slot="headline">${section.label}</span>
      </ha-combo-box-item>
      ${expanded
        ? html`
            ${section.devices
              ? repeat(
                  section.devices,
                  (device: DeviceNode) => device.id,
                  (device: DeviceNode) => this._renderDevice(device, key)
                )
              : nothing}
            ${section.domains
              ? repeat(
                  section.domains,
                  (g: DomainGroup) => g.domain,
                  (g: DomainGroup) => {
                    const dKey = domainKey(key, g.domain);
                    const dExpanded = this._isExpanded(dKey);
                    return html`
                      <ha-combo-box-item
                        type="button"
                        class="branch depth-area area-item"
                        aria-expanded=${dExpanded}
                        data-node-key=${dKey}
                        @click=${this._toggleNode}
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
                      ${dExpanded
                        ? repeat(
                            g.entityIds,
                            (id: string) => id,
                            (id: string) =>
                              this._renderEntity(id, "depth-entity-area")
                          )
                        : nothing}
                    `;
                  }
                )
              : nothing}
          `
        : nothing}
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
      <ha-combo-box-item
        type="button"
        class="leaf ${depthClass} entity-item ${selected ? "selected" : ""}"
        aria-current=${selected ? "true" : "false"}
        data-entity-id=${entityId}
        @click=${this._pickEntity}
      >
        <div slot="start" class="leading">
          <span class="chevron-spacer"></span>
          ${stateObj
            ? html`<state-badge
                .hass=${this.hass}
                .stateObj=${stateObj}
              ></state-badge>`
            : nothing}
        </div>
        <span slot="headline">${name}</span>
      </ha-combo-box-item>
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

  private _pickEntity(ev: Event) {
    const target = ev.currentTarget as HTMLElement;
    const entityId = target.dataset.entityId;
    if (!entityId) return;
    this._expandToEntity(entityId);
    fireEvent(this, "entity-picked", { entityId });
  }

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
          padding: var(--ha-space-3) var(--ha-space-3) var(--ha-space-2);
        }
        .tree {
          flex: 1;
          min-height: 0;
          overflow: auto;
          padding-bottom: var(--ha-space-3);
        }
        ha-combo-box-item {
          --md-list-item-one-line-container-height: 40px;
          --md-list-item-two-line-container-height: 48px;
          --md-list-item-leading-space: var(--ha-space-3);
          --md-list-item-trailing-space: var(--ha-space-3);
          --md-list-item-leading-element-leading-space: 0;
          width: 100%;
        }
        ha-combo-box-item.depth-area {
          --md-list-item-leading-space: var(--ha-space-8);
        }
        ha-combo-box-item.depth-device {
          --md-list-item-leading-space: var(--ha-space-12);
        }
        ha-combo-box-item.depth-entity-area {
          --md-list-item-leading-space: var(--ha-space-12);
        }
        ha-combo-box-item.depth-entity-device {
          --md-list-item-leading-space: var(--ha-space-16);
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
          --md-list-item-label-text-weight: var(--ha-font-weight-medium);
        }
        .entity-item.selected {
          background-color: var(
            --ha-color-fill-primary-quiet-resting,
            rgba(var(--rgb-primary-color, 33, 150, 243), 0.12)
          );
          --md-list-item-label-text-color: var(--primary-color);
          --md-list-item-label-text-weight: var(--ha-font-weight-medium);
        }
        .entity-item.selected .leading state-badge {
          --state-icon-color: var(--primary-color);
        }
        .empty {
          padding: var(--ha-space-4);
          color: var(--ha-color-text-secondary);
          text-align: center;
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
}
