import { mdiChevronDown, mdiChevronRight, mdiTextureBox } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeEntityName } from "../../../../common/entity/compute_entity_name";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { stringCompare } from "../../../../common/string/compare";
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
import { isUnavailableState } from "../../../../data/entity/entity";
import { getFloorAreaLookup } from "../../../../data/floor_registry";
import { domainToName } from "../../../../data/integration";
import { haStyleScrollbar } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";

declare global {
  interface HASSDomEvents {
    "entity-picked": { entityId: string };
  }
}

interface DeviceNode {
  id: string;
  name: string;
  entityIds: string[];
}

interface AreaNode {
  id: string;
  name: string;
  icon?: string;
  directEntityIds: string[];
  devices: DeviceNode[];
}

interface FloorNode {
  id: string;
  name: string;
  icon: string | null;
  level: number | null;
  areas: AreaNode[];
}

interface DomainGroup {
  domain: string;
  name: string;
  entityIds: string[];
}

interface TreeData {
  floors: FloorNode[];
  unassignedAreas: AreaNode[];
  otherDevices: DeviceNode[];
  otherDomains: DomainGroup[];
}

const NO_FLOOR_ID = "__no_floor__";
const OTHER_GROUP_ID = "__other__";
const SEP = "~";

const floorKey = (id: string) => `f|${id}`;
const areaKey = (parent: string, id: string) => `${parent}${SEP}a|${id}`;
const deviceKey = (parent: string, id: string) => `${parent}${SEP}d|${id}`;
const domainKey = (parent: string, domain: string) =>
  `${parent}${SEP}dom|${domain}`;

const LEAD_AREA = "var(--ha-space-8)";
const LEAD_DEVICE = "var(--ha-space-12)";
const LEAD_ENTITY_AREA = "var(--ha-space-12)";
const LEAD_ENTITY_DEVICE = "var(--ha-space-16)";

@customElement("hui-recipe-entity-tree")
export class HuiRecipeEntityTree extends LitElement {
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
      // No-op: device rows will fall back to a generic icon
    }
  }

  private _deviceDomain(deviceId: string): string | undefined {
    const device = this.hass?.devices[deviceId];
    if (!device?.primary_config_entry) return undefined;
    return this._configEntryLookup[device.primary_config_entry]?.domain;
  }

  private _buildTree = memoizeOne(
    (
      states: HomeAssistant["states"],
      entityReg: HomeAssistant["entities"],
      deviceReg: HomeAssistant["devices"],
      areaReg: HomeAssistant["areas"],
      floorReg: HomeAssistant["floors"],
      language: string | undefined
    ): TreeData => {
      const areaDirectEntities = new Map<string, string[]>();
      const areaDeviceEntities = new Map<string, Map<string, string[]>>();
      const orphanDeviceEntities = new Map<string, string[]>();
      const orphanByDomain = new Map<string, string[]>();

      for (const entityId of Object.keys(states)) {
        const stateObj = states[entityId];
        if (!stateObj || isUnavailableState(stateObj.state)) continue;

        const entry = entityReg[entityId];
        if (entry?.hidden) continue;

        const device = entry?.device_id
          ? deviceReg[entry.device_id]
          : undefined;
        const areaId = entry?.area_id ?? device?.area_id;

        if (!areaId || !areaReg[areaId]) {
          if (device) {
            const list = orphanDeviceEntities.get(device.id) ?? [];
            list.push(entityId);
            orphanDeviceEntities.set(device.id, list);
          } else {
            const domain = computeDomain(entityId);
            const list = orphanByDomain.get(domain) ?? [];
            list.push(entityId);
            orphanByDomain.set(domain, list);
          }
          continue;
        }

        const groupUnderDevice = device && !entry?.area_id;
        if (groupUnderDevice) {
          const byDevice = areaDeviceEntities.get(areaId) ?? new Map();
          const list = byDevice.get(device!.id) ?? [];
          list.push(entityId);
          byDevice.set(device!.id, list);
          areaDeviceEntities.set(areaId, byDevice);
        } else {
          const list = areaDirectEntities.get(areaId) ?? [];
          list.push(entityId);
          areaDirectEntities.set(areaId, list);
        }
      }

      const sortByName = (a: string, b: string) => {
        const an = computeStateName(states[a]) || a;
        const bn = computeStateName(states[b]) || b;
        return stringCompare(an, bn, language);
      };

      const buildAreaNode = (areaId: string): AreaNode | undefined => {
        const area = areaReg[areaId];
        if (!area) return undefined;
        const directIds = (areaDirectEntities.get(areaId) ?? []).sort(
          sortByName
        );
        const byDevice = areaDeviceEntities.get(areaId);
        const devices: DeviceNode[] = byDevice
          ? [...byDevice.entries()]
              .map(([id, ids]) => {
                const device = deviceReg[id];
                return {
                  id,
                  name: (device ? computeDeviceName(device) : undefined) ?? id,
                  entityIds: ids.sort(sortByName),
                };
              })
              .sort((a, b) => stringCompare(a.name, b.name, language))
          : [];
        if (!directIds.length && !devices.length) return undefined;
        return {
          id: area.area_id,
          name: computeAreaName(area) ?? area.area_id,
          icon: area.icon ?? undefined,
          directEntityIds: directIds,
          devices,
        };
      };

      const areas = Object.values(areaReg);
      const floors = Object.values(floorReg);
      const floorAreaLookup = getFloorAreaLookup(areas);

      const floorNodes: FloorNode[] = floors
        .map((floor) => {
          const areaList = (floorAreaLookup[floor.floor_id] ?? [])
            .map((a) => buildAreaNode(a.area_id))
            .filter((a): a is AreaNode => !!a)
            .sort((a, b) => stringCompare(a.name, b.name, language));
          if (!areaList.length) return undefined;
          return {
            id: floor.floor_id,
            name: floor.name,
            icon: floor.icon,
            level: floor.level,
            areas: areaList,
          };
        })
        .filter((f): f is FloorNode => !!f)
        .sort((a, b) => stringCompare(a.name, b.name, language));

      const unassignedAreas = areas
        .filter((a) => !a.floor_id || !floorReg[a.floor_id])
        .map((a) => buildAreaNode(a.area_id))
        .filter((a): a is AreaNode => !!a)
        .sort((a, b) => stringCompare(a.name, b.name, language));

      const otherDevices: DeviceNode[] = [...orphanDeviceEntities.entries()]
        .map(([id, ids]) => {
          const device = deviceReg[id];
          return {
            id,
            name: (device ? computeDeviceName(device) : undefined) ?? id,
            entityIds: ids.sort(sortByName),
          };
        })
        .sort((a, b) => stringCompare(a.name, b.name, language));

      const otherDomains: DomainGroup[] = [...orphanByDomain.entries()]
        .map(([domain, ids]) => ({
          domain,
          name: domainToName(this.hass.localize, domain),
          entityIds: ids.sort(sortByName),
        }))
        .sort((a, b) => stringCompare(a.name, b.name, language));

      return {
        floors: floorNodes,
        unassignedAreas,
        otherDevices,
        otherDomains,
      };
    }
  );

  private _filteredTree = memoizeOne(
    (tree: TreeData, filter: string, states: HomeAssistant["states"]) => {
      if (!filter) return { tree, autoExpand: new Set<string>() };

      const lower = filter.toLowerCase();
      const matches = (entityId: string) => {
        const stateObj = states[entityId];
        const name = stateObj ? computeStateName(stateObj) : "";
        return (
          entityId.toLowerCase().includes(lower) ||
          name.toLowerCase().includes(lower)
        );
      };

      const autoExpand = new Set<string>();

      const filterArea = (
        area: AreaNode,
        parentKey: string
      ): AreaNode | undefined => {
        const aKey = areaKey(parentKey, area.id);
        const directIds = area.directEntityIds.filter(matches);
        const devices = area.devices
          .map((device) => {
            const ids = device.entityIds.filter(matches);
            if (!ids.length) return undefined;
            autoExpand.add(deviceKey(aKey, device.id));
            return { ...device, entityIds: ids };
          })
          .filter((d): d is DeviceNode => !!d);
        if (!directIds.length && !devices.length) return undefined;
        autoExpand.add(aKey);
        return { ...area, directEntityIds: directIds, devices };
      };

      const floors = tree.floors
        .map((floor) => {
          const fKey = floorKey(floor.id);
          const areas = floor.areas
            .map((a) => filterArea(a, fKey))
            .filter((a): a is AreaNode => !!a);
          if (!areas.length) return undefined;
          autoExpand.add(fKey);
          return { ...floor, areas };
        })
        .filter((f): f is FloorNode => !!f);

      const noFloorKey = floorKey(NO_FLOOR_ID);
      const unassignedAreas = tree.unassignedAreas
        .map((a) => filterArea(a, noFloorKey))
        .filter((a): a is AreaNode => !!a);
      if (unassignedAreas.length) {
        autoExpand.add(noFloorKey);
      }

      const otherKey = floorKey(OTHER_GROUP_ID);
      const otherDevices = tree.otherDevices
        .map((device) => {
          const ids = device.entityIds.filter(matches);
          if (!ids.length) return undefined;
          autoExpand.add(deviceKey(otherKey, device.id));
          return { ...device, entityIds: ids };
        })
        .filter((d): d is DeviceNode => !!d);

      const otherDomains = tree.otherDomains
        .map((group) => {
          const ids = group.entityIds.filter(matches);
          if (!ids.length) return undefined;
          autoExpand.add(domainKey(otherKey, group.domain));
          return { ...group, entityIds: ids };
        })
        .filter((g): g is DomainGroup => !!g);
      if (otherDevices.length || otherDomains.length) {
        autoExpand.add(otherKey);
      }

      return {
        tree: { floors, unassignedAreas, otherDevices, otherDomains },
        autoExpand,
      };
    }
  );

  protected render() {
    if (!this.hass) return nothing;

    const fullTree = this._buildTree(
      this.hass.states,
      this.hass.entities,
      this.hass.devices,
      this.hass.areas,
      this.hass.floors,
      this.hass.locale?.language
    );

    const { tree, autoExpand } = this._filteredTree(
      fullTree,
      this._filter,
      this.hass.states
    );

    const isExpanded = (key: string) =>
      this._filter ? autoExpand.has(key) : (this._expanded[key] ?? false);

    const noResults =
      !tree.floors.length &&
      !tree.unassignedAreas.length &&
      !tree.otherDevices.length &&
      !tree.otherDomains.length;

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
        ${tree.floors.map((floor) =>
          this._renderFloor(floor, false, isExpanded)
        )}
        ${tree.unassignedAreas.length
          ? this._renderFloor(
              {
                id: NO_FLOOR_ID,
                name: this.hass.localize(
                  "ui.panel.lovelace.editor.cardpicker.no_floor"
                ),
                icon: null,
                level: null,
                areas: tree.unassignedAreas,
              },
              true,
              isExpanded
            )
          : nothing}
        ${tree.otherDevices.length || tree.otherDomains.length
          ? this._renderOther(tree.otherDevices, tree.otherDomains, isExpanded)
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
        class="branch floor-item"
        .nodeKey=${key}
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
        ? floor.areas.map((area) => this._renderArea(area, key, isExpanded))
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
        class="branch area-item"
        style="--md-list-item-leading-space: ${LEAD_AREA};"
        .nodeKey=${key}
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
            ${area.directEntityIds.map((id) =>
              this._renderEntity(id, LEAD_ENTITY_AREA)
            )}
            ${area.devices.map((device) =>
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
        class="branch device-item"
        style="--md-list-item-leading-space: ${LEAD_DEVICE};"
        .nodeKey=${key}
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
        ? device.entityIds.map((id) =>
            this._renderEntity(id, LEAD_ENTITY_DEVICE)
          )
        : nothing}
    `;
  }

  private _renderOther(
    devices: DeviceNode[],
    domains: DomainGroup[],
    isExpanded: (k: string) => boolean
  ): TemplateResult {
    const key = floorKey(OTHER_GROUP_ID);
    const expanded = isExpanded(key);
    return html`
      <ha-combo-box-item
        type="button"
        class="branch floor-item"
        .nodeKey=${key}
        @click=${this._toggleNode}
      >
        <div slot="start" class="leading">
          ${this._renderChevron(expanded)}
          <ha-svg-icon .path=${mdiTextureBox}></ha-svg-icon>
        </div>
        <span slot="headline">
          ${this.hass.localize("ui.panel.lovelace.editor.cardpicker.no_area")}
        </span>
      </ha-combo-box-item>
      ${expanded
        ? html`
            ${devices.map((device) =>
              this._renderDevice(device, key, isExpanded)
            )}
            ${domains.map((g) => {
              const dKey = domainKey(key, g.domain);
              const dExpanded = isExpanded(dKey);
              return html`
                <ha-combo-box-item
                  type="button"
                  class="branch area-item"
                  style="--md-list-item-leading-space: ${LEAD_AREA};"
                  .nodeKey=${dKey}
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
                  ? g.entityIds.map((id) =>
                      this._renderEntity(id, LEAD_ENTITY_AREA)
                    )
                  : nothing}
              `;
            })}
          `
        : nothing}
    `;
  }

  private _renderEntity(
    entityId: string,
    leadingSpace: string
  ): TemplateResult {
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
        class="leaf entity-item ${selected ? "selected" : ""}"
        style="--md-list-item-leading-space: ${leadingSpace};"
        .entityId=${entityId}
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
    const target = ev.currentTarget as HTMLElement & { nodeKey: string };
    const key = target.nodeKey;
    if (this._expanded[key]) {
      const next = { ...this._expanded };
      delete next[key];
      const prefix = key + SEP;
      for (const k of Object.keys(next)) {
        if (k.startsWith(prefix)) delete next[k];
      }
      this._expanded = next;
    } else {
      this._expanded = { ...this._expanded, [key]: true };
    }
  }

  private _pickEntity(ev: Event) {
    const target = ev.currentTarget as HTMLElement & { entityId: string };
    fireEvent(this, "entity-picked", { entityId: target.entityId });
  }

  private _handleFilterChange(ev: Event) {
    this._filter = (ev.target as HaInputSearch).value ?? "";
  }

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
    "hui-recipe-entity-tree": HuiRecipeEntityTree;
  }
}
