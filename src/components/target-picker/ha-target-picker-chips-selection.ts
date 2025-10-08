import { consume } from "@lit/context";
// @ts-ignore
import chipStyles from "@material/chips/dist/mdc.chips.min.css";
import {
  mdiClose,
  mdiDevices,
  mdiHome,
  mdiLabel,
  mdiTextureBox,
  mdiUnfoldMoreVertical,
} from "@mdi/js";
import { css, html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { computeCssColor } from "../../common/color/compute-color";
import { hex2rgb } from "../../common/color/convert-color";
import { fireEvent } from "../../common/dom/fire_event";
import {
  computeDeviceName,
  computeDeviceNameDisplay,
} from "../../common/entity/compute_device_name";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeEntityName } from "../../common/entity/compute_entity_name";
import { getEntityContext } from "../../common/entity/context/get_entity_context";
import { getConfigEntry } from "../../data/config_entries";
import { labelsContext } from "../../data/context";
import { domainToName } from "../../data/integration";
import type { LabelRegistryEntry } from "../../data/label_registry";
import type { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import { floorDefaultIconPath } from "../ha-floor-icon";
import "../ha-icon";
import "../ha-icon-button";
import "../ha-md-list";
import "../ha-md-list-item";
import "../ha-state-icon";
import "../ha-tooltip";
import type { TargetType } from "./ha-target-picker-item-row";

@customElement("ha-target-picker-chips-selection")
export class HaTargetPickerChipsSelection extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ reflect: true }) public type!: TargetType;

  @property({ attribute: "item-id" }) public itemId!: string;

  @state() private _domainName?: string;

  @state() private _iconImg?: string;

  @state()
  @consume({ context: labelsContext, subscribe: true })
  _labelRegistry!: LabelRegistryEntry[];

  protected render() {
    const { name, iconPath, fallbackIconPath, stateObject, color } =
      this._itemData(this.type, this.itemId);

    return html`
      <div
        class="mdc-chip ${classMap({
          [this.type]: true,
        })}"
        style=${color
          ? `--color: rgb(${color}); --background-color: rgba(${color}, .5)`
          : ""}
      >
        ${iconPath
          ? html`<ha-icon
              class="mdc-chip__icon mdc-chip__icon--leading"
              .icon=${iconPath}
            ></ha-icon>`
          : this._iconImg
            ? html`<img
                class="mdc-chip__icon mdc-chip__icon--leading"
                alt=${this._domainName || ""}
                crossorigin="anonymous"
                referrerpolicy="no-referrer"
                src=${this._iconImg}
              />`
            : fallbackIconPath
              ? html`<ha-svg-icon
                  class="mdc-chip__icon mdc-chip__icon--leading"
                  .path=${fallbackIconPath}
                ></ha-svg-icon>`
              : stateObject
                ? html`<ha-state-icon
                    class="mdc-chip__icon mdc-chip__icon--leading"
                    .hass=${this.hass}
                    .stateObj=${stateObject}
                  ></ha-state-icon>`
                : nothing}
        <span role="gridcell">
          <span role="button" tabindex="0" class="mdc-chip__primary-action">
            <span id="title-${this.itemId}" class="mdc-chip__text"
              >${name}</span
            >
          </span>
        </span>
        ${this.type === "entity"
          ? nothing
          : html`<span role="gridcell">
              <ha-tooltip .for="expand-${this.itemId}"
                >${this.hass.localize(
                  `ui.components.target-picker.expand_${this.type}_id`
                )}
              </ha-tooltip>
              <ha-icon-button
                class="expand-btn mdc-chip__icon mdc-chip__icon--trailing"
                .label=${this.hass.localize(
                  "ui.components.target-picker.expand"
                )}
                .path=${mdiUnfoldMoreVertical}
                hide-title
                .id="expand-${this.itemId}"
                .type=${this.type}
                @click=${this._handleExpand}
              ></ha-icon-button>
            </span>`}
        <span role="gridcell">
          <ha-tooltip .for="remove-${this.itemId}">
            ${this.hass.localize(
              `ui.components.target-picker.remove_${this.type}_id`
            )}
          </ha-tooltip>
          <ha-icon-button
            class="mdc-chip__icon mdc-chip__icon--trailing"
            .label=${this.hass.localize("ui.components.target-picker.remove")}
            .path=${mdiClose}
            hide-title
            .id="remove-${this.itemId}"
            .type=${this.type}
            @click=${this._removeItem}
          ></ha-icon-button>
        </span>
      </div>
    `;
  }

  private _itemData = memoizeOne((type: TargetType, itemId: string) => {
    if (type === "floor") {
      const floor = this.hass.floors?.[itemId];
      return {
        name: floor?.name || itemId,
        iconPath: floor?.icon,
        fallbackIconPath: floor ? floorDefaultIconPath(floor) : mdiHome,
      };
    }
    if (type === "area") {
      const area = this.hass.areas?.[itemId];
      return {
        name: area?.name || itemId,
        iconPath: area?.icon,
        fallbackIconPath: mdiTextureBox,
      };
    }
    if (type === "device") {
      const device = this.hass.devices?.[itemId];

      if (device.primary_config_entry) {
        this._getDeviceDomain(device.primary_config_entry);
      }

      return {
        name: device ? computeDeviceNameDisplay(device, this.hass) : itemId,
        fallbackIconPath: mdiDevices,
      };
    }
    if (type === "entity") {
      this._setDomainName(computeDomain(itemId));

      const stateObject = this.hass.states[itemId];
      const entityName = computeEntityName(
        stateObject,
        this.hass.entities,
        this.hass.devices
      );
      const { device } = getEntityContext(
        stateObject,
        this.hass.entities,
        this.hass.devices,
        this.hass.areas,
        this.hass.floors
      );
      const deviceName = device ? computeDeviceName(device) : undefined;
      return {
        name: entityName || deviceName || itemId,
        stateObject,
      };
    }

    // type label
    const label = this._labelRegistry.find((lab) => lab.label_id === itemId);
    let color = label?.color ? computeCssColor(label.color) : undefined;
    if (color?.startsWith("var(")) {
      const computedStyles = getComputedStyle(this);
      color = computedStyles.getPropertyValue(
        color.substring(4, color.length - 1)
      );
    }
    if (color?.startsWith("#")) {
      color = hex2rgb(color).join(",");
    }
    return {
      name: label?.name || itemId,
      iconPath: label?.icon,
      fallbackIconPath: mdiLabel,
      color,
    };
  });

  private _setDomainName(domain: string) {
    this._domainName = domainToName(this.hass.localize, domain);
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

  private _removeItem(ev) {
    ev.stopPropagation();
    fireEvent(this, "remove-target-item", {
      type: this.type,
      id: this.itemId,
    });
  }

  private _handleExpand(ev) {
    ev.stopPropagation();
    fireEvent(this, "expand-target-item", {
      type: this.type,
      id: this.itemId,
    });
  }

  static styles = css`
    ${unsafeCSS(chipStyles)}
    .mdc-chip {
      color: var(--primary-text-color);
    }
    .mdc-chip.add {
      color: rgba(0, 0, 0, 0.87);
    }
    .add-container {
      position: relative;
      display: inline-flex;
    }
    .mdc-chip:not(.add) {
      cursor: default;
    }
    .mdc-chip ha-icon-button {
      --mdc-icon-button-size: 24px;
      display: flex;
      align-items: center;
      outline: none;
    }
    .mdc-chip ha-icon-button ha-svg-icon {
      border-radius: 50%;
      background: var(--secondary-text-color);
    }
    .mdc-chip__icon.mdc-chip__icon--trailing {
      width: var(--ha-space-4);
      height: var(--ha-space-4);
      --mdc-icon-size: 14px;
      color: var(--secondary-text-color);
      margin-inline-start: var(--ha-space-1) !important;
      margin-inline-end: calc(-1 * var(--ha-space-1)) !important;
      direction: var(--direction);
    }
    .mdc-chip__icon--leading {
      display: flex;
      align-items: center;
      justify-content: center;
      --mdc-icon-size: 20px;
      border-radius: var(--ha-border-radius-circle);
      padding: 6px;
      margin-left: -13px !important;
      margin-inline-start: -13px !important;
      margin-inline-end: var(--ha-space-1) !important;
      direction: var(--direction);
    }
    .expand-btn {
      margin-right: var(--ha-space-0);
      margin-inline-end: var(--ha-space-0);
      margin-inline-start: initial;
    }
    .mdc-chip.area:not(.add),
    .mdc-chip.floor:not(.add) {
      border: 1px solid #fed6a4;
      background: var(--card-background-color);
    }
    .mdc-chip.area:not(.add) .mdc-chip__icon--leading,
    .mdc-chip.area.add,
    .mdc-chip.floor:not(.add) .mdc-chip__icon--leading,
    .mdc-chip.floor.add {
      background: #fed6a4;
    }
    .mdc-chip.device:not(.add) {
      border: 1px solid #a8e1fb;
      background: var(--card-background-color);
    }
    .mdc-chip.device:not(.add) .mdc-chip__icon--leading,
    .mdc-chip.device.add {
      background: #a8e1fb;
    }
    .mdc-chip.entity:not(.add) {
      border: 1px solid #d2e7b9;
      background: var(--card-background-color);
    }
    .mdc-chip.entity:not(.add) .mdc-chip__icon--leading,
    .mdc-chip.entity.add {
      background: #d2e7b9;
    }
    .mdc-chip.label:not(.add) {
      border: 1px solid var(--color, #e0e0e0);
      background: var(--card-background-color);
    }
    .mdc-chip.label:not(.add) .mdc-chip__icon--leading,
    .mdc-chip.label.add {
      background: var(--background-color, #e0e0e0);
    }
    .mdc-chip:hover {
      z-index: 5;
    }
    :host([disabled]) .mdc-chip {
      opacity: var(--light-disabled-opacity);
      pointer-events: none;
    }
    .tooltip-icon-img {
      width: 24px;
      height: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-target-picker-chips-selection": HaTargetPickerChipsSelection;
  }
}
