import { consume } from "@lit/context";
import {
  mdiClose,
  mdiDevices,
  mdiHome,
  mdiLabel,
  mdiTextureBox,
} from "@mdi/js";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeAreaName } from "../../common/entity/compute_area_name";
import {
  computeDeviceName,
  computeDeviceNameDisplay,
} from "../../common/entity/compute_device_name";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeEntityName } from "../../common/entity/compute_entity_name";
import { getEntityContext } from "../../common/entity/context/get_entity_context";
import { computeRTL } from "../../common/util/compute_rtl";
import { getConfigEntry } from "../../data/config_entries";
import { labelsContext } from "../../data/context";
import { domainToName } from "../../data/integration";
import type { LabelRegistryEntry } from "../../data/label_registry";
import {
  areaMeetsFilter,
  deviceMeetsFilter,
  entityRegMeetsFilter,
  extractFromTarget,
  type ExtractFromTargetResult,
  type ExtractFromTargetResultReferenced,
} from "../../data/target";
import { buttonLinkStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import type { HaDevicePickerDeviceFilterFunc } from "../device/ha-device-picker";
import type { HaEntityPickerEntityFilterFunc } from "../entity/ha-entity-picker";
import { floorDefaultIconPath } from "../ha-floor-icon";
import "../ha-icon-button";
import "../ha-md-list";
import type { HaMdList } from "../ha-md-list";
import "../ha-md-list-item";
import type { HaMdListItem } from "../ha-md-list-item";
import "../ha-state-icon";
import "../ha-svg-icon";
import { showTargetDetailsDialog } from "./dialog/show-dialog-target-details";

export type TargetType = "entity" | "device" | "area" | "label" | "floor";

@customElement("ha-target-picker-item-row")
export class HaTargetPickerItemRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ reflect: true }) public type!: TargetType;

  @property({ attribute: "item-id" }) public itemId!: string;

  @property({ type: Boolean }) public expand = false;

  @property({ type: Boolean, attribute: "last" }) public lastItem = false;

  @property({ type: Boolean, attribute: "sub-entry", reflect: true })
  public subEntry = false;

  @property({ type: Boolean, attribute: "hide-context" })
  public hideContext = false;

  @property({ attribute: false })
  public parentEntries?: ExtractFromTargetResultReferenced;

  @property({ attribute: false })
  public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property({ attribute: false })
  public entityFilter?: HaEntityPickerEntityFilterFunc;

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

  @state() private _iconImg?: string;

  @state() private _domainName?: string;

  @state() private _entries?: ExtractFromTargetResult;

  @state()
  @consume({ context: labelsContext, subscribe: true })
  _labelRegistry!: LabelRegistryEntry[];

  @query("ha-md-list-item") public item?: HaMdListItem;

  @query("ha-md-list") public list?: HaMdList;

  @query("ha-target-picker-item-row") public itemRow?: HaTargetPickerItemRow;

  protected willUpdate(changedProps: PropertyValues) {
    if (!this.subEntry && changedProps.has("itemId")) {
      this._updateItemData();
    }
  }

  protected render() {
    const { name, context, iconPath, fallbackIconPath, stateObject } =
      this._itemData(this.type, this.itemId);

    const showDevices = ["floor", "area", "label"].includes(this.type);
    const showEntities = this.type !== "entity";

    const entries = this.parentEntries || this._entries;

    // Don't show sub entries that have no entities
    if (
      this.subEntry &&
      this.type !== "entity" &&
      (!entries || entries.referenced_entities.length === 0)
    ) {
      return nothing;
    }

    return html`
      <ha-md-list-item type="text">
        <div slot="start">
          ${this.subEntry
            ? html`
                <div class="horizontal-line-wrapper">
                  <div class="horizontal-line"></div>
                </div>
              `
            : nothing}
          ${iconPath
            ? html`<ha-icon .icon=${iconPath}></ha-icon>`
            : this._iconImg
              ? html`<img
                  alt=${this._domainName || ""}
                  crossorigin="anonymous"
                  referrerpolicy="no-referrer"
                  src=${this._iconImg}
                />`
              : fallbackIconPath
                ? html`<ha-svg-icon .path=${fallbackIconPath}></ha-svg-icon>`
                : stateObject
                  ? html`
                      <ha-state-icon
                        .hass=${this.hass}
                        .stateObj=${stateObject}
                      >
                      </ha-state-icon>
                    `
                  : nothing}
        </div>

        <div slot="headline">${name}</div>
        ${context && !this.hideContext
          ? html`<span slot="supporting-text">${context}</span>`
          : this._domainName && this.subEntry
            ? html`<span slot="supporting-text" class="domain"
                >${this._domainName}</span
              >`
            : nothing}
        ${!this.subEntry &&
        ((entries && (showEntities || showDevices)) || this._domainName)
          ? html`
              <div slot="end" class="summary">
                ${showEntities && !this.expand
                  ? html`<button class="main link" @click=${this._openDetails}>
                      ${this.hass.localize(
                        "ui.components.target-picker.entities_count",
                        {
                          count: entries?.referenced_entities.length,
                        }
                      )}
                    </button>`
                  : showEntities
                    ? html`<span class="main">
                        ${this.hass.localize(
                          "ui.components.target-picker.entities_count",
                          {
                            count: entries?.referenced_entities.length,
                          }
                        )}
                      </span>`
                    : nothing}
                ${showDevices
                  ? html`<span class="secondary"
                      >${this.hass.localize(
                        "ui.components.target-picker.devices_count",
                        {
                          count: entries?.referenced_devices.length,
                        }
                      )}</span
                    >`
                  : nothing}
                ${this._domainName && !showDevices
                  ? html`<span class="secondary domain"
                      >${this._domainName}</span
                    >`
                  : nothing}
              </div>
            `
          : nothing}
        ${!this.expand && !this.subEntry
          ? html`
              <ha-icon-button
                .path=${mdiClose}
                slot="end"
                @click=${this._removeItem}
              ></ha-icon-button>
            `
          : nothing}
      </ha-md-list-item>
      ${this.expand && entries && entries.referenced_entities
        ? this._renderEntries()
        : nothing}
    `;
  }

  private _renderEntries() {
    const entries = this.parentEntries || this._entries;

    let nextType: TargetType =
      this.type === "floor"
        ? "area"
        : this.type === "area"
          ? "device"
          : "entity";

    if (this.type === "label") {
      if (entries?.referenced_areas.length) {
        nextType = "area";
      } else if (entries?.referenced_devices.length) {
        nextType = "device";
      }
    }

    const rows1 =
      (nextType === "area"
        ? entries?.referenced_areas
        : nextType === "device"
          ? entries?.referenced_devices
          : entries?.referenced_entities) || [];

    const devicesInAreas = [] as string[];

    const rows1Entries =
      nextType === "entity"
        ? undefined
        : rows1.map((rowItem) => {
            const nextEntries = {
              referenced_areas: [] as string[],
              referenced_devices: [] as string[],
              referenced_entities: [] as string[],
            };

            if (nextType === "area") {
              nextEntries.referenced_devices =
                entries?.referenced_devices.filter(
                  (device_id) =>
                    this.hass.devices?.[device_id]?.area_id === rowItem &&
                    entries?.referenced_entities.some(
                      (entity_id) =>
                        this.hass.entities?.[entity_id]?.device_id === device_id
                    )
                ) || ([] as string[]);

              devicesInAreas.push(...nextEntries.referenced_devices);

              nextEntries.referenced_entities =
                entries?.referenced_entities.filter((entity_id) => {
                  const entity = this.hass.entities[entity_id];
                  return (
                    entity.area_id === rowItem ||
                    !entity.device_id ||
                    nextEntries.referenced_devices.includes(entity.device_id)
                  );
                }) || ([] as string[]);

              return nextEntries;
            }

            nextEntries.referenced_entities =
              entries?.referenced_entities.filter(
                (entity_id) =>
                  this.hass.entities?.[entity_id]?.device_id === rowItem
              ) || ([] as string[]);

            return nextEntries;
          });

    const entityRows =
      this.type === "label" && entries
        ? entries.referenced_entities.filter((entity_id) =>
            this.hass.entities[entity_id].labels.includes(this.itemId)
          )
        : nextType === "device" && entries
          ? entries.referenced_entities.filter(
              (entity_id) =>
                this.hass.entities[entity_id].area_id === this.itemId
            )
          : [];

    const deviceRows =
      this.type === "label" && entries
        ? entries.referenced_devices.filter(
            (device_id) =>
              !devicesInAreas.includes(device_id) &&
              this.hass.devices[device_id].labels.includes(this.itemId)
          )
        : [];

    const deviceRowsEntries =
      deviceRows.length === 0
        ? undefined
        : deviceRows.map((device_id) => ({
            referenced_areas: [] as string[],
            referenced_devices: [] as string[],
            referenced_entities:
              entries?.referenced_entities.filter(
                (entity_id) =>
                  this.hass.entities?.[entity_id]?.device_id === device_id
              ) || ([] as string[]),
          }));

    return html`
      <div class="entries-tree">
        <div class="line-wrapper">
          <div class="line"></div>
        </div>
        <ha-md-list class="entries">
          ${rows1.map(
            (itemId, index) => html`
              <ha-target-picker-item-row
                sub-entry
                .hass=${this.hass}
                .type=${nextType}
                .itemId=${itemId}
                .parentEntries=${rows1Entries?.[index]}
                .hideContext=${this.hideContext || this.type !== "label"}
                expand
                .lastItem=${deviceRows.length === 0 &&
                entityRows.length === 0 &&
                index === rows1.length - 1}
              ></ha-target-picker-item-row>
            `
          )}
          ${deviceRows.map(
            (itemId, index) => html`
              <ha-target-picker-item-row
                sub-entry
                .hass=${this.hass}
                type="device"
                .itemId=${itemId}
                .parentEntries=${deviceRowsEntries?.[index]}
                .hideContext=${this.hideContext || this.type !== "label"}
                expand
                .lastItem=${entityRows.length === 0 &&
                index === deviceRows.length - 1}
              ></ha-target-picker-item-row>
            `
          )}
          ${entityRows.map(
            (itemId, index) => html`
              <ha-target-picker-item-row
                sub-entry
                .hass=${this.hass}
                type="entity"
                .itemId=${itemId}
                .hideContext=${this.hideContext || this.type !== "label"}
                .lastItem=${index === entityRows.length - 1}
              ></ha-target-picker-item-row>
            `
          )}
        </ha-md-list>
      </div>
    `;
  }

  private async _updateItemData() {
    if (this.type === "entity") {
      this._entries = undefined;
      return;
    }
    try {
      const entries = await extractFromTarget(this.hass, {
        [`${this.type}_id`]: [this.itemId],
      });

      const hiddenAreaIds: string[] = [];
      if (this.type === "floor" || this.type === "label") {
        entries.referenced_areas = entries.referenced_areas.filter(
          (area_id) => {
            const area = this.hass.areas[area_id];
            if (
              (this.type === "floor" || area.labels.includes(this.itemId)) &&
              areaMeetsFilter(
                area,
                this.hass.devices,
                this.hass.entities,
                this.deviceFilter,
                this.includeDomains,
                this.includeDeviceClasses,
                this.hass.states,
                this.entityFilter
              )
            ) {
              return true;
            }

            hiddenAreaIds.push(area_id);
            return false;
          }
        );
      }

      const hiddenDeviceIds: string[] = [];
      if (
        this.type === "floor" ||
        this.type === "area" ||
        this.type === "label"
      ) {
        entries.referenced_devices = entries.referenced_devices.filter(
          (device_id) => {
            const device = this.hass.devices[device_id];
            if (
              !hiddenAreaIds.includes(device.area_id || "") &&
              (this.type !== "label" || device.labels.includes(this.itemId)) &&
              deviceMeetsFilter(
                device,
                this.hass.entities,
                this.deviceFilter,
                this.includeDomains,
                this.includeDeviceClasses,
                this.hass.states,
                this.entityFilter
              )
            ) {
              return true;
            }

            hiddenDeviceIds.push(device_id);
            return false;
          }
        );
      }

      entries.referenced_entities = entries.referenced_entities.filter(
        (entity_id) => {
          const entity = this.hass.entities[entity_id];
          if (hiddenDeviceIds.includes(entity.device_id || "")) {
            return false;
          }
          if (
            (this.type === "area" && entity.area_id === this.itemId) ||
            (this.type === "label" && entity.labels.includes(this.itemId)) ||
            entries.referenced_devices.includes(entity.device_id || "")
          ) {
            return entityRegMeetsFilter(
              entity,
              this.type === "label",
              this.includeDomains,
              this.includeDeviceClasses,
              this.hass.states,
              this.entityFilter
            );
          }
          return false;
        }
      );

      this._entries = entries;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to extract target", e);
    }
  }

  private _itemData = memoizeOne((type: TargetType, item: string) => {
    if (type === "floor") {
      const floor = this.hass.floors?.[item];
      return {
        name: floor?.name || item,
        iconPath: floor?.icon,
        fallbackIconPath: floor ? floorDefaultIconPath(floor) : mdiHome,
      };
    }
    if (type === "area") {
      const area = this.hass.areas?.[item];
      return {
        name: area?.name || item,
        context: area.floor_id && this.hass.floors?.[area.floor_id]?.name,
        iconPath: area?.icon,
        fallbackIconPath: mdiTextureBox,
      };
    }
    if (type === "device") {
      const device = this.hass.devices?.[item];

      if (device.primary_config_entry) {
        this._getDeviceDomain(device.primary_config_entry);
      }

      return {
        name: device ? computeDeviceNameDisplay(device, this.hass) : item,
        context: device?.area_id && this.hass.areas?.[device.area_id]?.name,
        fallbackIconPath: mdiDevices,
      };
    }
    if (type === "entity") {
      this._setDomainName(computeDomain(item));

      const stateObject = this.hass.states[item];
      const entityName = computeEntityName(
        stateObject,
        this.hass.entities,
        this.hass.devices
      );
      const { area, device } = getEntityContext(
        stateObject,
        this.hass.entities,
        this.hass.devices,
        this.hass.areas,
        this.hass.floors
      );
      const deviceName = device ? computeDeviceName(device) : undefined;
      const areaName = area ? computeAreaName(area) : undefined;
      const context = [areaName, entityName ? deviceName : undefined]
        .filter(Boolean)
        .join(computeRTL(this.hass) ? " ◂ " : " ▸ ");
      return {
        name: entityName || deviceName || item,
        context,
        stateObject,
      };
    }

    // type label
    const label = this._labelRegistry.find((lab) => lab.label_id === item);
    return {
      name: label?.name || item,
      iconPath: label?.icon,
      fallbackIconPath: mdiLabel,
    };
  });

  private _setDomainName(domain: string) {
    this._domainName = domainToName(this.hass.localize, domain);
  }

  private _removeItem(ev) {
    ev.stopPropagation();
    fireEvent(this, "remove-target-item", {
      type: this.type,
      id: this.itemId,
    });
  }

  private async _getDeviceDomain(configEntryId: string) {
    try {
      const data = await getConfigEntry(this.hass, configEntryId);
      const domain = data.config_entry.domain;
      this._iconImg = brandsUrl({
        domain: domain,
        type: "icon",
        darkOptimized: this.hass.themes?.darkMode,
      });

      this._setDomainName(domain);
    } catch {
      // failed to load config entry -> ignore
    }
  }

  private _openDetails() {
    showTargetDetailsDialog(this, {
      title: this._itemData(this.type, this.itemId).name,
      type: this.type,
      itemId: this.itemId,
      deviceFilter: this.deviceFilter,
      entityFilter: this.entityFilter,
      includeDomains: this.includeDomains,
      includeDeviceClasses: this.includeDeviceClasses,
    });
  }

  static styles = [
    buttonLinkStyle,
    css`
      :host {
        --md-list-item-top-space: 0;
        --md-list-item-bottom-space: 0;
        --md-list-item-leading-space: 8px;
        --md-list-item-trailing-space: 8px;
        --md-list-item-two-line-container-height: 56px;
      }

      :host([expand]:not([sub-entry])) ha-md-list-item {
        border: 2px solid var(--ha-color-border-neutral-loud);
        background-color: var(--ha-color-fill-neutral-quiet-resting);
        border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
      }

      state-badge {
        color: var(--ha-color-on-neutral-quiet);
      }
      img {
        width: 24px;
        height: 24px;
      }
      ha-icon-button {
        --mdc-icon-button-size: 32px;
      }
      .summary {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        line-height: var(--ha-line-height-condensed);
      }
      :host([sub-entry]) .summary {
        margin-right: 48px;
      }
      .summary .main {
        font-weight: var(--ha-font-weight-medium);
      }
      .summary .secondary {
        font-size: var(--ha-font-size-s);
        color: var(--secondary-text-color);
      }
      .domain {
        font-family: var(--ha-font-family-code);
      }

      .entries-tree {
        display: flex;
        position: relative;
      }

      .entries-tree .line-wrapper {
        padding: 20px;
      }

      .entries-tree .line-wrapper .line {
        border-left: 2px dashed var(--divider-color);
        height: calc(100% - 28px);
        position: absolute;
        top: 0;
      }

      :host([sub-entry]) .entries-tree .line-wrapper .line {
        height: calc(100% - 12px);
        top: -18px;
      }

      .entries {
        padding: 0;
        --md-item-overflow: visible;
      }

      .horizontal-line-wrapper {
        position: relative;
      }
      .horizontal-line-wrapper .horizontal-line {
        position: absolute;
        top: 11px;
        margin-inline-start: -28px;
        width: 29px;
        border-top: 2px dashed var(--divider-color);
      }

      button.link {
        text-decoration: none;
        color: var(--primary-color);
      }

      button.link:hover,
      button.link:focus {
        text-decoration: underline;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-target-picker-item-row": HaTargetPickerItemRow;
  }
}
