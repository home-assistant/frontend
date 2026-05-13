import { mdiChevronDown, mdiChevronRight, mdiTextureBox } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeEntityName } from "../../../../common/entity/compute_entity_name";
import { computeStateName } from "../../../../common/entity/compute_state_name";
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
  EntityTree,
  FloorNode,
  UnassignedSection,
} from "./entity-tree-builder";
import {
  areaKey,
  buildEntityTree,
  childKeyPrefix,
  deviceKey,
  domainKey,
  filterEntityTree,
  floorKey,
  OTHER_AREAS_ID,
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

  @property({ attribute: false, type: Array })
  public selectedEntityIds: string[] = [];

  @state() private _filter = "";

  @state() private _expanded: Record<string, boolean> = {};

  @state() private _configEntryLookup: Record<string, ConfigEntry> = {};

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass && !Object.keys(this._configEntryLookup).length) {
      this._loadConfigEntries();
    }
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

  // Built once on first render. Rebuilding on every hass tick would re-run
  // Fuse.createIndex and freeze the search input; a snapshot is enough for a
  // picker session — entities added/renamed mid-session won't show up until
  // the dialog reopens.
  @state() private _tree?: EntityTree;

  private _filteredMemo = memoizeOne(filterEntityTree);

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (!this._tree && this.hass) {
      this._tree = buildEntityTree(this.hass);
    }
  }

  protected render() {
    if (!this.hass || !this._tree) return nothing;

    const { tree, autoExpand } = this._filteredMemo(this._tree, this._filter);

    const isExpanded = (key: string) =>
      this._filter ? autoExpand.has(key) : (this._expanded[key] ?? false);

    const noResults =
      !tree.floors.length &&
      !tree.otherAreas.length &&
      !tree.unassignedSections.length;

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
        ${noResults
          ? html`<div class="empty">
              ${this.hass.localize("ui.common.no_results")}
            </div>`
          : nothing}
        ${tree.floors.length || tree.otherAreas.length
          ? html`
              <ha-section-title>
                ${this.hass.localize(
                  "ui.panel.lovelace.editor.cardpicker.home"
                )}
              </ha-section-title>
              ${repeat(
                tree.floors,
                (floor: FloorNode) => floor.id,
                (floor: FloorNode) =>
                  this._renderFloor(floor, false, isExpanded)
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
                    true,
                    isExpanded
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
                  this._renderUnassignedSection(section, isExpanded)
              )}
            `
          : nothing}
      </div>
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
    isUnassigned: boolean,
    isExpanded: (k: string) => boolean
  ): TemplateResult {
    const key = floorKey(floor.id);
    const expanded = isExpanded(key);
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
            (area: AreaNode) => this._renderArea(area, key, isExpanded)
          )
        : nothing}
    `;
  }

  private _renderArea(
    area: AreaNode,
    parentKey: string,
    isExpanded: (k: string) => boolean
  ): TemplateResult {
    const key = areaKey(parentKey, area.id);
    const expanded = isExpanded(key);
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
              area.directEntityIds,
              (id: string) => id,
              (id: string) => this._renderEntity(id, "depth-entity-area")
            )}
            ${repeat(
              area.devices,
              (device: DeviceNode) => device.id,
              (device: DeviceNode) =>
                this._renderDevice(device, key, isExpanded)
            )}
          `
        : nothing}
    `;
  }

  private _renderDevice(
    device: DeviceNode,
    parentKey: string,
    isExpanded: (k: string) => boolean
  ): TemplateResult {
    const key = deviceKey(parentKey, device.id);
    const expanded = isExpanded(key);
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

  private _renderUnassignedSection(
    section: UnassignedSection,
    isExpanded: (k: string) => boolean
  ): TemplateResult {
    const key = unassignedKey(section.id);
    const expanded = isExpanded(key);
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
                  (device: DeviceNode) =>
                    this._renderDevice(device, key, isExpanded)
                )
              : nothing}
            ${section.domains
              ? repeat(
                  section.domains,
                  (g: DomainGroup) => g.domain,
                  (g: DomainGroup) => {
                    const dKey = domainKey(key, g.domain);
                    const dExpanded = isExpanded(dKey);
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
    const selected = this.selectedEntityIds.includes(entityId);
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
    fireEvent(this, "entity-picked", { entityId });
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
          --mdc-icon-size: 20px;
          color: var(--secondary-text-color);
        }
        .leading state-badge {
          --state-icon-color: var(--secondary-text-color);
          width: 20px;
          height: 20px;
        }
        .chevron {
          --mdc-icon-size: 20px;
          color: var(--secondary-text-color);
          flex: 0 0 20px;
        }
        .chevron-spacer {
          width: 20px;
          flex: 0 0 20px;
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
