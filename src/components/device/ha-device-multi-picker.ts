// @ts-ignore
import chipStyles from "@material/chips/dist/mdc.chips.min.css";
import "@material/mwc-button/mwc-button";
import "@polymer/paper-tooltip/paper-tooltip";
import { mdiClose, mdiDevices, mdiPlus } from "@mdi/js";
import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../common/dom/fire_event";
import { ensureArray } from "../../common/ensure-array";
import {
  computeDeviceName,
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../data/device_registry";
import { EntityRegistryEntry } from "../../data/entity_registry";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../types";
import { HaDevicePickerDeviceFilterFunc } from "./ha-device-picker";
import "../ha-icon-button";
import "../ha-state-icon";
import "../ha-svg-icon";

@customElement("ha-device-multi-picker")
export class HaDeviceMultiPicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled?: boolean;

  @property() public label?: string;

  @property() public value?: any;

  /**
   * Show only devices with entities from specific domains.
   * @type {Array}
   * @attr include-domains
   */

  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show no devices with entities of these domains.
   * @type {Array}
   * @attr exclude-domains
   */
  @property({ type: Array, attribute: "exclude-domains" })
  public excludeDomains?: string[];

  /**
   * Show only devices with entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  @property() public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property() public entityFilter?: (entity: EntityRegistryEntry) => boolean;

  @property({ type: Boolean, attribute: "multiple" })
  public multiple?: boolean;

  @state() private _devices?: { [deviceId: string]: DeviceRegistryEntry };

  @state() private _addMode?: "device_id";

  @query("#input") private _inputElement?;

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeDeviceRegistry(this.hass.connection!, (devices) => {
        const deviceLookup: { [deviceId: string]: DeviceRegistryEntry } = {};
        for (const device of devices) {
          deviceLookup[device.id] = device;
        }
        this._devices = deviceLookup;
      }),
    ];
  }

  protected render() {
    if (!this._devices) {
      return html``;
    }
    return html`
      <div class="mdc-chip-set items">
        ${this.value
          ? ensureArray(this.value).map((device_id) => {
              const device = this._devices![device_id];
              return this._renderChip(
                "device_id",
                device_id,
                device ? computeDeviceName(device, this.hass) : device_id,
                undefined,
                mdiDevices
              );
            })
          : ""}
      </div>
      ${this._renderPicker()}
      <div class="mdc-chip-set">
        <div
          class="mdc-chip device_id add"
          .type=${"device_id"}
          @click=${this._showPicker}
        >
          <div class="mdc-chip__ripple"></div>
          <ha-svg-icon
            class="mdc-chip__icon mdc-chip__icon--leading"
            .path=${mdiPlus}
          ></ha-svg-icon>
          <span role="gridcell">
            <span role="button" tabindex="0" class="mdc-chip__primary-action">
              <span class="mdc-chip__text"
                >${this.hass.localize(
                  "ui.components.target-picker.add_device_id"
                )}</span
              >
            </span>
          </span>
        </div>
      </div>
    `;
  }

  private async _showPicker(ev) {
    this._addMode = ev.currentTarget.type;
    await this.updateComplete;
    setTimeout(() => {
      this._inputElement?.open();
      this._inputElement?.focus();
    }, 0);
  }

  private _renderChip(
    type: string,
    id: string,
    name: string,
    entityState?: HassEntity,
    iconPath?: string
  ) {
    return html`
      <div
        class="mdc-chip ${classMap({
          [type]: true,
        })}"
      >
        ${iconPath
          ? html`<ha-svg-icon
              class="mdc-chip__icon mdc-chip__icon--leading"
              .path=${iconPath}
            ></ha-svg-icon>`
          : ""}
        ${entityState
          ? html`<ha-state-icon
              class="mdc-chip__icon mdc-chip__icon--leading"
              .state=${entityState}
            ></ha-state-icon>`
          : ""}
        <span role="gridcell">
          <span role="button" tabindex="0" class="mdc-chip__primary-action">
            <span class="mdc-chip__text">${name}</span>
          </span>
        </span>
        <span role="gridcell">
          <ha-icon-button
            class="mdc-chip__icon mdc-chip__icon--trailing"
            tabindex="-1"
            role="button"
            .label=${this.hass.localize("ui.components.target-picker.remove_")}
            .path=${mdiClose}
            hideTooltip
            .id=${id}
            .type=${type}
            @click=${this._handleRemove}
          ></ha-icon-button>
          <paper-tooltip animation-delay="0"
            >${this.hass.localize(
              `ui.components.target-picker.remove_${type}`
            )}</paper-tooltip
          >
        </span>
      </div>
    `;
  }

  private _renderPicker() {
    switch (this._addMode) {
      case "device_id":
        return html`<ha-device-picker
          .hass=${this.hass}
          id="input"
          .type=${"device_id"}
          .label=${this.hass.localize(
            "ui.components.target-picker.add_device_id"
          )}
          no-add
          .deviceFilter=${this.deviceFilter}
          .entityFilter=${this.entityFilter}
          .includeDeviceClasses=${this.includeDeviceClasses}
          .includeDomains=${this.includeDomains}
          .disabled=${this.disabled}
          @value-changed=${this._targetPicked}
        ></ha-device-picker>`;
    }
    return html``;
  }

  private _targetPicked(ev) {
    ev.stopPropagation();
    if (!ev.detail.value) {
      return;
    }
    const value =
      this.multiple && this.value
        ? [...ensureArray(this.value), ev.detail.value]
        : ev.detail.value;
    const target = ev.currentTarget;
    target.value = "";
    this._addMode = undefined;
    fireEvent(this, "value-changed", { value });
  }

  private _handleRemove(ev) {
    const target = ev.currentTarget as any;
    fireEvent(this, "value-changed", {
      value: this._removeItem(this.value, target.id),
    });
  }

  private _removeItem(value: this["value"], id: string): this["value"] {
    const newVal = ensureArray(value!)!.filter((val) => String(val) !== id);
    if (newVal.length) {
      return newVal;
    }
    return undefined;
  }

  static get styles(): CSSResultGroup {
    return css`
      ${unsafeCSS(chipStyles)}
      .mdc-chip {
        color: var(--primary-text-color);
      }
      .items {
        z-index: 2;
      }
      .mdc-chip-set {
        padding: 4px 0;
      }
      .mdc-chip.add {
        color: rgba(0, 0, 0, 0.87);
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
        width: 16px;
        height: 16px;
        --mdc-icon-size: 14px;
        color: var(--secondary-text-color);
      }
      .mdc-chip__icon--leading {
        display: flex;
        align-items: center;
        justify-content: center;
        --mdc-icon-size: 20px;
        border-radius: 50%;
        padding: 6px;
        margin-left: -14px !important;
      }
      .expand-btn {
        margin-right: 0;
      }
      .mdc-chip.area_id:not(.add) {
        border: 2px solid #fed6a4;
        background: var(--card-background-color);
      }
      .mdc-chip.area_id:not(.add) .mdc-chip__icon--leading,
      .mdc-chip.area_id.add {
        background: #fed6a4;
      }
      .mdc-chip.device_id:not(.add) {
        border: 2px solid #a8e1fb;
        background: var(--card-background-color);
      }
      .mdc-chip.device_id:not(.add) .mdc-chip__icon--leading,
      .mdc-chip.device_id.add {
        background: #a8e1fb;
      }
      .mdc-chip.entity_id:not(.add) {
        border: 2px solid #d2e7b9;
        background: var(--card-background-color);
      }
      .mdc-chip.entity_id:not(.add) .mdc-chip__icon--leading,
      .mdc-chip.entity_id.add {
        background: #d2e7b9;
      }
      .mdc-chip:hover {
        z-index: 5;
      }
      paper-tooltip.expand {
        min-width: 200px;
      }
      :host([disabled]) .mdc-chip {
        opacity: var(--light-disabled-opacity);
        pointer-events: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-multi-picker": HaDeviceMultiPicker;
  }
}
