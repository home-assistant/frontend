import { consume } from "@lit/context";
import {
  mdiChevronDown,
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
  extractFromTarget,
  type ExtractFromTargetResult,
} from "../../data/target";
import type { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import { floorDefaultIconPath } from "../ha-floor-icon";
import "../ha-icon-button";
import "../ha-md-list";
import type { HaMdList } from "../ha-md-list";
import "../ha-md-list-item";
import type { HaMdListItem } from "../ha-md-list-item";
import "../ha-state-icon";
import "../ha-svg-icon";

export type TargetType = "entity" | "device" | "area" | "label" | "floor";

@customElement("ha-target-picker-item-row")
export class HaTargetPickerItemRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ reflect: true }) public type!: TargetType;

  @property({ attribute: "item-id" }) public itemId!: string;

  @property({ type: Boolean, attribute: "sub-entry", reflect: true })
  public subEntry = false;

  @property({ attribute: false })
  public parentEntries?: ExtractFromTargetResult;

  @state() private _expanded = false;

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
      this._expanded = false;
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
      <ha-md-list-item
        .disabled=${entries?.referenced_entities.length === 0}
        .type=${this.type === "entity" ? "text" : "button"}
        @click=${this._toggleExpand}
      >
        ${this.type !== "entity"
          ? html`<ha-svg-icon
              class="expand-button ${entries?.referenced_entities.length &&
              this._expanded
                ? "expanded"
                : ""}"
              .path=${mdiChevronDown}
              slot="start"
            ></ha-svg-icon>`
          : nothing}
        ${iconPath
          ? html`<ha-icon slot="start" .icon=${iconPath}></ha-icon>`
          : this._iconImg
            ? html`<img
                slot="start"
                alt=${this._domainName || ""}
                crossorigin="anonymous"
                referrerpolicy="no-referrer"
                src=${this._iconImg}
              />`
            : fallbackIconPath
              ? html`<ha-svg-icon
                  slot="start"
                  .path=${fallbackIconPath}
                ></ha-svg-icon>`
              : stateObject
                ? html`
                    <ha-state-icon
                      .hass=${this.hass}
                      .stateObj=${stateObject}
                      slot="start"
                    >
                    </ha-state-icon>
                  `
                : nothing}
        <div slot="headline">${name}</div>
        ${context && !this.subEntry
          ? html`<span slot="supporting-text">${context}</span>`
          : nothing}
        ${showEntities || showDevices || this._domainName
          ? html`
              <div slot="end" class="summary">
                ${showEntities
                  ? html`<span class="main"
                      >${this.hass.localize(
                        "ui.components.target-picker.entities_count",
                        {
                          count: entries?.referenced_entities.length,
                        }
                      )}</span
                    >`
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
        ${!this.subEntry
          ? html`
              <ha-icon-button
                .path=${mdiClose}
                slot="end"
                @click=${this._removeItem}
              ></ha-icon-button>
            `
          : nothing}
      </ha-md-list-item>
      ${this._expanded && entries && entries.referenced_entities
        ? this._renderEntries()
        : nothing}
    `;
  }

  private _renderEntries() {
    const entries = this.parentEntries || this._entries;

    let nextType =
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

    const rows1Entries =
      nextType === "entity"
        ? undefined
        : rows1.map((rowItem) => {
            const nextEntries = {
              missing_areas: [] as string[],
              missing_devices: [] as string[],
              missing_floors: [] as string[],
              missing_labels: [] as string[],
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

    const rows2 =
      nextType === "device" && entries
        ? entries.referenced_entities.filter(
            (entity_id) => this.hass.entities[entity_id].area_id === this.itemId
          )
        : [];

    return html`
      <ha-md-list class="entries">
        ${rows1.map(
          (itemId, index) => html`
            <ha-target-picker-item-row
              sub-entry
              .hass=${this.hass}
              .type=${nextType}
              .itemId=${itemId}
              .parentEntries=${rows1Entries?.[index]}
            ></ha-target-picker-item-row>
          `
        )}
        ${rows2.map(
          (itemId) => html`
            <ha-target-picker-item-row
              sub-entry
              .hass=${this.hass}
              type="entity"
              .itemId=${itemId}
            ></ha-target-picker-item-row>
          `
        )}
      </ha-md-list>
    `;
  }

  private async _updateItemData() {
    try {
      this._entries = await extractFromTarget(this.hass, {
        [`${this.type}_id`]: [this.itemId],
      });
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
      const entityName = computeEntityName(stateObject, this.hass);
      const { area, device } = getEntityContext(stateObject, this.hass);
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

  private _toggleExpand() {
    const entries = this.parentEntries || this._entries;

    if (
      this.type === "entity" ||
      !entries ||
      entries.referenced_entities.length === 0
    ) {
      return;
    }
    this._expanded = !this._expanded;
  }

  static styles = css`
    :host {
      --md-list-item-top-space: 0;
      --md-list-item-bottom-space: 0;
      --md-list-item-leading-space: 8px;
      --md-list-item-trailing-space: 8px;
      --md-list-item-two-line-container-height: 56px;
    }

    state-badge {
      color: var(--ha-color-on-neutral-quiet);
    }
    img {
      width: 24px;
      height: 24px;
    }
    .expand-button {
      transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .expand-button.expanded {
      transform: rotate(180deg);
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
    .summary .secondary.domain {
      font-family: var(--ha-font-family-code);
    }

    @media all and (max-width: 870px) {
      :host([sub-entry]) .summary {
        display: none;
      }
    }

    .entries {
      padding: 0;
      padding-left: 40px;
      overflow: hidden;
      transition: height 300ms cubic-bezier(0.4, 0, 0.2, 1);
      border-bottom: 1px solid var(--ha-color-border-neutral-quiet);
    }

    :host([sub-entry]) .entries {
      border-bottom: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-target-picker-item-row": HaTargetPickerItemRow;
  }
}
