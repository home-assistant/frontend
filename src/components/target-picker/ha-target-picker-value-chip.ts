import "@home-assistant/webawesome/dist/components/tag/tag";
import { consume } from "@lit/context";
import {
  mdiDevices,
  mdiHome,
  mdiLabel,
  mdiTextureBox,
  mdiUnfoldMoreVertical,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeCssColor } from "../../common/color/compute-color";
import { hex2rgb } from "../../common/color/convert-color";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDeviceNameDisplay } from "../../common/entity/compute_device_name";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { slugify } from "../../common/string/slugify";
import { getConfigEntry } from "../../data/config_entries";
import { labelsContext } from "../../data/context";
import { domainToName } from "../../data/integration";
import type { LabelRegistryEntry } from "../../data/label/label_registry";
import type { TargetType } from "../../data/target";
import type { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import "../ha-domain-icon";
import { floorDefaultIconPath } from "../ha-floor-icon";
import "../ha-icon";
import "../ha-icon-button";
import "../ha-md-list";
import "../ha-md-list-item";
import "../ha-state-icon";
import "../ha-tooltip";

@customElement("ha-target-picker-value-chip")
export class HaTargetPickerValueChip extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public type!: TargetType;

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
      <wa-tag
        pill
        with-remove
        class=${this.type}
        style=${color ? `--color: rgb(${color});` : ""}
        @wa-remove=${this._removeItem}
      >
        <div class="icon">
          ${iconPath
            ? html`<ha-icon .icon=${iconPath}></ha-icon>`
            : this._iconImg
              ? html`<img
                  alt=${this._domainName || ""}
                  width="24"
                  crossorigin="anonymous"
                  referrerpolicy="no-referrer"
                  src=${this._iconImg}
                />`
              : fallbackIconPath
                ? html`<ha-svg-icon .path=${fallbackIconPath}></ha-svg-icon>`
                : stateObject
                  ? html`<ha-state-icon
                      .hass=${this.hass}
                      .stateObj=${stateObject}
                    ></ha-state-icon>`
                  : nothing}
        </div>
        <span class="name"> ${name} </span>
        ${this.type === "entity"
          ? nothing
          : html`<ha-tooltip .for="expand-${slugify(this.itemId)}"
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
                .id="expand-${slugify(this.itemId)}"
                .type=${this.type}
                @click=${this._handleExpand}
              ></ha-icon-button>`}
      </wa-tag>
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
        name: device
          ? computeDeviceNameDisplay(
              device,
              this.hass.localize,
              this.hass.states
            )
          : itemId,
        fallbackIconPath: mdiDevices,
      };
    }
    if (type === "entity") {
      this._setDomainName(computeDomain(itemId));

      const stateObj = this.hass.states[itemId];
      return {
        name: computeStateName(stateObj) || itemId,
        stateObject: stateObj,
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
      this._iconImg = brandsUrl(
        {
          domain: domain,
          type: "icon",
          darkOptimized: this.hass.themes?.darkMode,
        },
        this.hass.auth.data.hassUrl
      );

      this._setDomainName(domain);
    } catch {
      // failed to load config entry -> ignore
    }
  }

  private _removeItem(ev: MouseEvent) {
    ev.stopPropagation();
    fireEvent(this, "remove-target-item", {
      type: this.type,
      id: this.itemId,
    });
  }

  private _handleExpand(ev: MouseEvent) {
    ev.stopPropagation();
    fireEvent(this, "expand-target-item", {
      type: this.type,
      id: this.itemId,
    });
  }

  static styles = css`
    :host {
      display: inline-block;
      max-width: 100%;
    }
    wa-tag {
      background-color: var(--card-background-color);
      border-width: var(--ha-border-width-md);
      padding-inline-start: 0;
      overflow: hidden;
      max-width: 100%;
      color: var(--primary-text-color);
    }

    wa-tag.entity {
      border-color: var(--ha-color-green-80);
      --background-color: var(--ha-color-green-80);
    }
    wa-tag.device {
      border-color: var(--ha-color-primary-80);
      --background-color: var(--ha-color-primary-80);
    }
    wa-tag.area {
      border-color: var(--ha-color-orange-80);
      --background-color: var(--ha-color-orange-80);
    }
    wa-tag.label {
      border-color: var(--color);
      --background-color: var(--color);
      --icon-primary-color: var(--primary-text-color);
    }

    .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .icon {
      background-color: var(--background-color);
      border-radius: var(--ha-border-radius-circle);
      padding: var(--ha-space-2) var(--ha-space-1);
      display: flex;
    }
    .expand-btn {
      --ha-icon-button-size: 16px;
      --mdc-icon-size: 14px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-target-picker-value-chip": HaTargetPickerValueChip;
  }
}
