import {
  mdiChevronDown,
  mdiClose,
  mdiDevices,
  mdiHome,
  mdiTextureBox,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeAreaName } from "../../common/entity/compute_area_name";
import {
  computeDeviceName,
  computeDeviceNameDisplay,
} from "../../common/entity/compute_device_name";
import { computeEntityName } from "../../common/entity/compute_entity_name";
import { getEntityContext } from "../../common/entity/context/get_entity_context";
import { computeRTL } from "../../common/util/compute_rtl";
import { getConfigEntry } from "../../data/config_entries";
import type { DeviceRegistryEntry } from "../../data/device_registry";
import type { EntityRegistryDisplayEntry } from "../../data/entity_registry";
import { domainToName } from "../../data/integration";
import type { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import { floorDefaultIconPath } from "../ha-floor-icon";
import "../ha-icon-button";
import "../ha-md-list";
import "../ha-md-list-item";
import "../ha-state-icon";

export type TargetType = "entity" | "device" | "area" | "label" | "floor";

@customElement("ha-target-picker-item-row")
export class HaTargetPickerItemRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public type!: TargetType;

  @property() public item!: string;

  @state() private _expanded = false;

  @state() private _iconImg?: string;

  @state() private _domainName?: string;

  protected render() {
    const { name, context, iconPath, fallbackIconPath, stateObject } =
      this._itemData(this.type, this.item);

    const showDevices = ["floor", "area", "label"].includes(this.type);
    const showEntities = this.type !== "entity";

    let devices: DeviceRegistryEntry[] = [];

    if (showDevices) {
      devices = this._getDevices(this.hass.devices, this.type, this.item);
    }

    let entities: EntityRegistryDisplayEntry[] = [];
    if (showEntities) {
      entities = this._getEntities(
        devices,
        this.hass.entities,
        this.type,
        this.item
      );
    }

    return html`
      <ha-md-list-item>
        ${this.type !== "entity"
          ? html`<ha-icon-button
              class="expand-button ${classMap({
                expanded: entities.length && this._expanded,
              })}"
              .path=${mdiChevronDown}
              slot="start"
              @click=${this._toggleExpand}
              .disabled=${entities.length === 0}
            ></ha-icon-button>`
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
        ${context
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
                          count: entities.length,
                        }
                      )}</span
                    >`
                  : nothing}
                ${showDevices
                  ? html`<span class="secondary"
                      >${this.hass.localize(
                        "ui.components.target-picker.devices_count",
                        {
                          count: devices.length,
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

        <ha-icon-button
          .path=${mdiClose}
          slot="end"
          @click=${this._removeItem}
        ></ha-icon-button>
      </ha-md-list-item>
      ${this._expanded
        ? html`
            ${entities.map(
              (entity) =>
                html`<ha-md-list-item class="indent">
                  <div slot="headline">
                    ${computeEntityName(
                      this.hass.states[entity.entity_id],
                      this.hass
                    )}
                  </div>
                  <span slot="supporting-text">${entity.entity_id}</span>
                </ha-md-list-item>`
            )}
          `
        : nothing}
    `;
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
        this._getDomainIcon(device.primary_config_entry);
      }

      return {
        name: device ? computeDeviceNameDisplay(device, this.hass) : item,
        context: device?.area_id && this.hass.areas?.[device.area_id]?.name,
        fallbackIconPath: mdiDevices,
      };
    }
    if (type === "entity") {
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
    return { name: item };
  });

  private _removeItem() {
    fireEvent(this, "remove-target-item", {
      type: this.type,
      id: this.item,
    });
  }

  private _getDevices = memoizeOne(
    (
      devices: HomeAssistant["devices"],
      type: TargetType,
      item: string
    ): DeviceRegistryEntry[] =>
      Object.values(devices).filter((device) => {
        if (!device.area_id) {
          return false;
        }
        if (type === "area") {
          return device.area_id === item;
        }
        if (type === "label") {
          return device.labels?.includes(item);
        }

        return this.hass.areas[device.area_id]?.floor_id === item;
      })
  );

  private _getEntities = memoizeOne(
    (
      devices: DeviceRegistryEntry[],
      entities: HomeAssistant["entities"],
      type: TargetType,
      item: string
    ): EntityRegistryDisplayEntry[] => {
      const deviceIds = devices.map((device) => device.id);

      return Object.values(entities).filter((entity) => {
        if (entity.hidden || entity.entity_category) {
          return false;
        }

        if (deviceIds.includes(entity.device_id || "")) {
          return true;
        }

        if (type === "area") {
          return entity.area_id === item;
        }
        if (entity.area_id && type === "floor") {
          return this.hass.areas[entity.area_id]?.floor_id === item;
        }
        if (type === "device") {
          return entity.device_id === item;
        }
        if (type === "label") {
          return entity.labels?.includes(item);
        }

        return false;
      });
    }
  );

  private async _getDomainIcon(configEntryId: string) {
    try {
      const data = await getConfigEntry(this.hass, configEntryId);
      const domain = data.config_entry.domain;
      this._iconImg = brandsUrl({
        domain: domain,
        type: "icon",
        darkOptimized: this.hass.themes?.darkMode,
      });
      this._domainName = domain
        ? domainToName(this.hass.localize, domain)
        : undefined;
    } catch {
      // failed to load config entry -> ignore
    }
  }

  private _toggleExpand() {
    this._expanded = !this._expanded;
  }

  static styles = css`
    ha-md-list-item {
      --md-list-item-top-space: 0;
      --md-list-item-bottom-space: 0;
      --md-list-item-trailing-space: 8px;
    }
    state-badge {
      color: var(--ha-color-on-neutral-quiet);
    }
    img {
      width: 24px;
      height: 24px;
    }
    .expand-button {
      margin: 0 -12px;
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

    ha-md-list-item.indent {
      padding-left: 32px;
    }

    ha-md-list-item.indent:last-of-type {
      border-bottom: 1px solid var(--ha-color-border-neutral-quiet);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-target-picker-item-row": HaTargetPickerItemRow;
  }
}
