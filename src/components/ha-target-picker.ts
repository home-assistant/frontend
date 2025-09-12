// @ts-ignore
import chipStyles from "@material/chips/dist/mdc.chips.min.css";
import "@material/mwc-menu/mwc-menu-surface";
import { mdiPlus } from "@mdi/js";
import type { ComboBoxLightOpenedChangedEvent } from "@vaadin/combo-box/vaadin-combo-box-light";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ensureArray } from "../common/array/ensure-array";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { isValidEntityId } from "../common/entity/valid_entity_id";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import type { HomeAssistant } from "../types";
import "./device/ha-device-picker";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./entity/ha-entity-picker";
import type { HaEntityPickerEntityFilterFunc } from "./entity/ha-entity-picker";
import "./ha-area-floor-picker";
import "./ha-icon-button";
import "./ha-input-helper-text";
import "./ha-label-picker";
import "./ha-svg-icon";
import "./ha-tooltip";
import "./target-picker/ha-target-picker-item-group";
import type { TargetType } from "./target-picker/ha-target-picker-item-row";

@customElement("ha-target-picker")
export class HaTargetPicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: HassServiceTarget;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public compact = false;

  @property({ attribute: false, type: Array }) public createDomains?: string[];

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

  @property({ attribute: false })
  public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property({ attribute: false })
  public entityFilter?: HaEntityPickerEntityFilterFunc;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ attribute: "add-on-top", type: Boolean }) public addOnTop = false;

  @state() private _addMode?:
    | "area_id"
    | "entity_id"
    | "device_id"
    | "label_id";

  @query("#input") private _inputElement?;

  @query(".add-container", true) private _addContainer?: HTMLDivElement;

  private _opened = false;

  protected render() {
    if (this.addOnTop) {
      return html` ${this._renderChips()} ${this._renderItems()} `;
    }
    return html` ${this._renderItems()} ${this._renderChips()} `;
  }

  private _renderItems() {
    if (
      !this.value?.floor_id &&
      !this.value?.area_id &&
      !this.value?.device_id &&
      !this.value?.entity_id &&
      !this.value?.label_id
    ) {
      return nothing;
    }

    return html`
      <div class="item-groups">
        ${this.value?.floor_id || this.value?.area_id
          ? html`
              <ha-target-picker-item-group
                @remove-target-item=${this._handleRemove}
                type="area"
                .hass=${this.hass}
                .items=${{
                  floor: ensureArray(this.value?.floor_id),
                  area: ensureArray(this.value?.area_id),
                }}
                .collapsed=${this.compact}
              >
              </ha-target-picker-item-group>
            `
          : nothing}
        ${this.value?.device_id
          ? html`
              <ha-target-picker-item-group
                @remove-target-item=${this._handleRemove}
                type="device"
                .hass=${this.hass}
                .items=${{ device: ensureArray(this.value?.device_id) }}
                .collapsed=${this.compact}
              >
              </ha-target-picker-item-group>
            `
          : nothing}
        ${this.value?.entity_id
          ? html`
              <ha-target-picker-item-group
                @remove-target-item=${this._handleRemove}
                type="entity"
                .hass=${this.hass}
                .items=${{ entity: ensureArray(this.value?.entity_id) }}
                .collapsed=${this.compact}
              >
              </ha-target-picker-item-group>
            `
          : nothing}
        ${this.value?.label_id
          ? html`
              <ha-target-picker-item-group
                @remove-target-item=${this._handleRemove}
                type="label"
                .hass=${this.hass}
                .items=${{ label: ensureArray(this.value?.label_id) }}
                .collapsed=${this.compact}
              >
              </ha-target-picker-item-group>
            `
          : nothing}
      </div>
    `;
  }

  private _renderChips() {
    return html`
      <div class="mdc-chip-set add-container">
        <div
          class="mdc-chip area_id add"
          .type=${"area_id"}
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
                  "ui.components.target-picker.add_area_id"
                )}</span
              >
            </span>
          </span>
        </div>
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
        <div
          class="mdc-chip entity_id add"
          .type=${"entity_id"}
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
                  "ui.components.target-picker.add_entity_id"
                )}</span
              >
            </span>
          </span>
        </div>
        <div
          class="mdc-chip label_id add"
          .type=${"label_id"}
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
                  "ui.components.target-picker.add_label_id"
                )}</span
              >
            </span>
          </span>
        </div>
        ${this._renderPicker()}
      </div>
      ${this.helper
        ? html`<ha-input-helper-text .disabled=${this.disabled}
            >${this.helper}</ha-input-helper-text
          >`
        : ""}
    `;
  }

  private _showPicker(ev) {
    this._addMode = ev.currentTarget.type;
  }

  private _renderPicker() {
    if (!this._addMode) {
      return nothing;
    }

    return html`<mwc-menu-surface
      open
      .anchor=${this._addContainer}
      @closed=${this._onClosed}
      @opened=${this._onOpened}
      @input=${stopPropagation}
      >${this._addMode === "area_id"
        ? html`
            <ha-area-floor-picker
              .hass=${this.hass}
              id="input"
              .type=${"area_id"}
              .placeholder=${this.hass.localize(
                "ui.components.target-picker.add_area_id"
              )}
              .searchLabel=${this.hass.localize(
                "ui.components.target-picker.add_area_id"
              )}
              .deviceFilter=${this.deviceFilter}
              .entityFilter=${this.entityFilter}
              .includeDeviceClasses=${this.includeDeviceClasses}
              .includeDomains=${this.includeDomains}
              .excludeAreas=${ensureArray(this.value?.area_id)}
              .excludeFloors=${ensureArray(this.value?.floor_id)}
              @value-changed=${this._targetPicked}
              @opened-changed=${this._openedChanged}
              @click=${this._preventDefault}
            ></ha-area-floor-picker>
          `
        : this._addMode === "device_id"
          ? html`
              <ha-device-picker
                .hass=${this.hass}
                id="input"
                .type=${"device_id"}
                .placeholder=${this.hass.localize(
                  "ui.components.target-picker.add_device_id"
                )}
                .searchLabel=${this.hass.localize(
                  "ui.components.target-picker.add_device_id"
                )}
                .deviceFilter=${this.deviceFilter}
                .entityFilter=${this.entityFilter}
                .includeDeviceClasses=${this.includeDeviceClasses}
                .includeDomains=${this.includeDomains}
                .excludeDevices=${ensureArray(this.value?.device_id)}
                @value-changed=${this._targetPicked}
                @opened-changed=${this._openedChanged}
                @click=${this._preventDefault}
              ></ha-device-picker>
            `
          : this._addMode === "label_id"
            ? html`
                <ha-label-picker
                  .hass=${this.hass}
                  id="input"
                  .type=${"label_id"}
                  .placeholder=${this.hass.localize(
                    "ui.components.target-picker.add_label_id"
                  )}
                  .searchLabel=${this.hass.localize(
                    "ui.components.target-picker.add_label_id"
                  )}
                  no-add
                  .deviceFilter=${this.deviceFilter}
                  .entityFilter=${this.entityFilter}
                  .includeDeviceClasses=${this.includeDeviceClasses}
                  .includeDomains=${this.includeDomains}
                  .excludeLabels=${ensureArray(this.value?.label_id)}
                  @value-changed=${this._targetPicked}
                  @opened-changed=${this._openedChanged}
                  @click=${this._preventDefault}
                ></ha-label-picker>
              `
            : html`
                <ha-entity-picker
                  .hass=${this.hass}
                  id="input"
                  .type=${"entity_id"}
                  .placeholder=${this.hass.localize(
                    "ui.components.target-picker.add_entity_id"
                  )}
                  .searchLabel=${this.hass.localize(
                    "ui.components.target-picker.add_entity_id"
                  )}
                  .entityFilter=${this.entityFilter}
                  .includeDeviceClasses=${this.includeDeviceClasses}
                  .includeDomains=${this.includeDomains}
                  .excludeEntities=${ensureArray(this.value?.entity_id)}
                  .createDomains=${this.createDomains}
                  @value-changed=${this._targetPicked}
                  @opened-changed=${this._openedChanged}
                  @click=${this._preventDefault}
                  allow-custom-entity
                ></ha-entity-picker>
              `}</mwc-menu-surface
    > `;
  }

  private _targetPicked(ev) {
    ev.stopPropagation();
    if (!ev.detail.value) {
      return;
    }
    let value = ev.detail.value;
    const target = ev.currentTarget;
    let type = target.type;

    if (type === "entity_id" && !isValidEntityId(value)) {
      return;
    }

    if (type === "area_id") {
      value = ev.detail.value.id;
      type = `${ev.detail.value.type}_id`;
    }

    target.value = "";
    if (
      this.value &&
      this.value[type] &&
      ensureArray(this.value[type]).includes(value)
    ) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: this.value
        ? {
            ...this.value,
            [type]: this.value[type]
              ? [...ensureArray(this.value[type]), value]
              : value,
          }
        : { [type]: value },
    });
  }

  private _handleRemove(ev) {
    const { type, id } = ev.detail;
    fireEvent(this, "value-changed", {
      value: this._removeItem(this.value, type, id),
    });
  }

  private _removeItem(
    value: this["value"],
    type: TargetType,
    id: string
  ): this["value"] {
    const typeId = `${type}_id`;

    const newVal = ensureArray(value![typeId])!.filter(
      (val) => String(val) !== id
    );
    if (newVal.length) {
      return {
        ...value,
        [typeId]: newVal,
      };
    }
    const val = { ...value }!;
    delete val[typeId];
    if (Object.keys(val).length) {
      return val;
    }
    return undefined;
  }

  private _onClosed(ev) {
    ev.stopPropagation();
    ev.target.open = true;
  }

  private async _onOpened() {
    if (!this._addMode) {
      return;
    }
    await this._inputElement?.focus();
    await this._inputElement?.open();
    this._opened = true;
  }

  private _openedChanged(ev: ComboBoxLightOpenedChangedEvent) {
    if (this._opened && !ev.detail.value) {
      this._opened = false;
      this._addMode = undefined;
    }
  }

  private _preventDefault(ev: Event) {
    ev.preventDefault();
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
        width: 16px;
        height: 16px;
        --mdc-icon-size: 14px;
        color: var(--secondary-text-color);
        margin-inline-start: 4px !important;
        margin-inline-end: -4px !important;
        direction: var(--direction);
      }
      .mdc-chip__icon--leading {
        display: flex;
        align-items: center;
        justify-content: center;
        --mdc-icon-size: 20px;
        border-radius: 50%;
        padding: 6px;
        margin-left: -13px !important;
        margin-inline-start: -13px !important;
        margin-inline-end: 4px !important;
        direction: var(--direction);
      }
      .expand-btn {
        margin-right: 0;
        margin-inline-end: 0;
        margin-inline-start: initial;
      }
      .mdc-chip:hover {
        z-index: 5;
      }
      :host([disabled]) .mdc-chip {
        opacity: var(--light-disabled-opacity);
        pointer-events: none;
      }
      mwc-menu-surface {
        --mdc-menu-min-width: 100%;
      }
      ha-entity-picker,
      ha-device-picker,
      ha-area-floor-picker {
        display: block;
        width: 100%;
      }
      ha-tooltip {
        --ha-tooltip-arrow-size: 0;
      }

      .item-groups {
        overflow: hidden;
        border: 2px solid var(--divider-color);
        border-radius: var(--ha-border-radius-lg);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-target-picker": HaTargetPicker;
  }

  interface HASSDomEvents {
    "remove-target-item": {
      type: string;
      id: string;
    };
    "remove-target-group": string;
  }
}
