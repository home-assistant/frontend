import {
  mdiChevronDown,
  mdiClose,
  mdiDevices,
  mdiHome,
  mdiTextureBox,
} from "@mdi/js";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
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
import { domainToName } from "../../data/integration";
import {
  extractFromTarget,
  type ExtractFromTargetResult,
} from "../../data/target";
import type { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import { floorDefaultIconPath } from "../ha-floor-icon";
import "../ha-icon-button";
import "../ha-md-list-item";
import "../ha-state-icon";

export type TargetType = "entity" | "device" | "area" | "label" | "floor";

@customElement("ha-target-picker-item-row")
export class HaTargetPickerItemRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ reflect: true }) public type!: TargetType;

  @property() public item!: string;

  @property({ type: Boolean, attribute: "sub-entry", reflect: true })
  public subEntry = false;

  @property({ attribute: false })
  public parentEntries?: ExtractFromTargetResult;

  @state() private _expanded = false;

  @state() private _iconImg?: string;

  @state() private _domainName?: string;

  @state() private _entries?: ExtractFromTargetResult;

  protected willUpdate(changedProps: PropertyValues) {
    if (!this.subEntry && changedProps.has("item")) {
      this._updateItemData();
      this._expanded = false;
    }
  }

  protected render() {
    const { name, context, iconPath, fallbackIconPath, stateObject } =
      this._itemData(this.type, this.item);

    const showDevices = ["floor", "area", "label"].includes(this.type);
    const showEntities = this.type !== "entity";

    const entries = this.parentEntries || this._entries;

    return html`
      <ha-md-list-item>
        ${
          this.type !== "entity"
            ? html`<ha-icon-button
                class="expand-button ${entries?.referenced_entities.length &&
                this._expanded
                  ? "expanded"
                  : ""}"
                .path=${mdiChevronDown}
                slot="start"
                @click=${this._toggleExpand}
                .disabled=${entries?.referenced_entities.length === 0}
              ></ha-icon-button>`
            : nothing
        }
        ${
          iconPath
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
                  : nothing
        }
        <div slot="headline">${name}</div>
        ${
          context
            ? html`<span slot="supporting-text">${context}</span>`
            : nothing
        }
        ${
          showEntities || showDevices || this._domainName
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
            : nothing
        }
  ${
    !this.subEntry
      ? html`
          <ha-icon-button
            .path=${mdiClose}
            slot="end"
            @click=${this._removeItem}
          ></ha-icon-button>
        `
      : nothing
  }
        </ha-icon-button>
      </ha-md-list-item>
      ${this._expanded && entries && entries.referenced_entities ? this._renderEntries() : nothing}
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
            (entity_id) => this.hass.entities[entity_id].area_id === this.item
          )
        : [];

    return html`
      <div class="entries ${this._expanded ? "expanded" : ""}">
        ${rows1.map(
          (item, index) =>
            html`
              <ha-target-picker-item-row
                sub-entry
                .hass=${this.hass}
                .type=${nextType}
                .item=${item}
                .parentEntries=${rows1Entries?.[index]}
              ></ha-target-picker-item-row>
            </ha-md-list-item>`
        )}
        ${rows2.map(
          (item) =>
            html`
              <ha-target-picker-item-row
                sub-entry
                .hass=${this.hass}
                type="entity"
                .item=${item}
              ></ha-target-picker-item-row>
            </ha-md-list-item>`
        )}
      </div>
    `;
  }

  private async _updateItemData() {
    try {
      this._entries = await extractFromTarget(this.hass, {
        [`${this.type}_id`]: [this.item],
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to update item data", e);
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
    :host {
      --md-list-item-top-space: 0;
      --md-list-item-bottom-space: 0;
      --md-list-item-trailing-space: 8px;
      --md-list-item-two-line-container-height: 56px;
    }

    :host([type="entity"]) {
      --md-list-item-leading-space: 8px;
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

    .entries {
      padding-left: 32px;
      overflow: hidden;
      transition: height 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .entries.expanded {
      border-bottom: 1px solid var(--ha-color-border-neutral-quiet);
    }
    :host([sub-entry]) .entries.expanded {
      border-bottom: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-target-picker-item-row": HaTargetPickerItemRow;
  }
}
