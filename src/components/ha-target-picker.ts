import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
// @ts-ignore
import chipStyles from "@material/chips/dist/mdc.chips.min.css";
import "@material/mwc-button/mwc-button";
import "@material/mwc-menu/mwc-menu-surface";
import {
  mdiClose,
  mdiDevices,
  mdiPlus,
  mdiSofa,
  mdiUnfoldMoreVertical,
} from "@mdi/js";
import { ComboBoxLightOpenedChangedEvent } from "@vaadin/combo-box/vaadin-combo-box-light";
import { HassEntity, HassServiceTarget } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ensureArray } from "../common/array/ensure-array";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { computeDomain } from "../common/entity/compute_domain";
import { computeStateName } from "../common/entity/compute_state_name";
import { isValidEntityId } from "../common/entity/valid_entity_id";
import {
  computeDeviceName,
  DeviceRegistryEntry,
} from "../data/device_registry";
import { EntityRegistryDisplayEntry } from "../data/entity_registry";
import { HomeAssistant } from "../types";
import "./device/ha-device-picker";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./entity/ha-entity-picker";
import type { HaEntityPickerEntityFilterFunc } from "./entity/ha-entity-picker";
import "./ha-area-picker";
import "./ha-icon-button";
import "./ha-input-helper-text";
import "./ha-svg-icon";

@customElement("ha-target-picker")
export class HaTargetPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: HassServiceTarget;

  @property() public label?: string;

  @property() public helper?: string;

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

  @property() public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property() public entityFilter?: HaEntityPickerEntityFilterFunc;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public addOnTop = false;

  @state() private _addMode?: "area_id" | "entity_id" | "device_id";

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
    return html`
      <div class="mdc-chip-set items">
        ${this.value?.area_id
          ? ensureArray(this.value.area_id).map((area_id) => {
              const area = this.hass.areas![area_id];
              return this._renderChip(
                "area_id",
                area_id,
                area?.name || area_id,
                undefined,
                mdiSofa
              );
            })
          : ""}
        ${this.value?.device_id
          ? ensureArray(this.value.device_id).map((device_id) => {
              const device = this.hass.devices![device_id];
              return this._renderChip(
                "device_id",
                device_id,
                device ? computeDeviceName(device, this.hass) : device_id,
                undefined,
                mdiDevices
              );
            })
          : ""}
        ${this.value?.entity_id
          ? ensureArray(this.value.entity_id).map((entity_id) => {
              const entity = this.hass.states[entity_id];
              return this._renderChip(
                "entity_id",
                entity_id,
                entity ? computeStateName(entity) : entity_id,
                entity
              );
            })
          : ""}
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
        ${this._renderPicker()}
      </div>
      ${this.helper
        ? html`<ha-input-helper-text>${this.helper}</ha-input-helper-text>`
        : ""}
    `;
  }

  private _showPicker(ev) {
    this._addMode = ev.currentTarget.type;
  }

  private _renderChip(
    type: "area_id" | "device_id" | "entity_id",
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
        ${type === "entity_id"
          ? ""
          : html`<span role="gridcell">
              <ha-icon-button
                class="expand-btn mdc-chip__icon mdc-chip__icon--trailing"
                .label=${this.hass.localize(
                  "ui.components.target-picker.expand"
                )}
                .path=${mdiUnfoldMoreVertical}
                hideTooltip
                .id=${id}
                .type=${type}
                @click=${this._handleExpand}
              ></ha-icon-button>
              <simple-tooltip class="expand" animation-delay="0"
                >${this.hass.localize(
                  `ui.components.target-picker.expand_${type}`
                )}</simple-tooltip
              >
            </span>`}
        <span role="gridcell">
          <ha-icon-button
            class="mdc-chip__icon mdc-chip__icon--trailing"
            .label=${this.hass.localize("ui.components.target-picker.remove")}
            .path=${mdiClose}
            hideTooltip
            .id=${id}
            .type=${type}
            @click=${this._handleRemove}
          ></ha-icon-button>
          <simple-tooltip animation-delay="0"
            >${this.hass.localize(
              `ui.components.target-picker.remove_${type}`
            )}</simple-tooltip
          >
        </span>
      </div>
    `;
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
      @opened-changed=${this._openedChanged}
      @input=${stopPropagation}
      >${this._addMode === "area_id"
        ? html`
            <ha-area-picker
              .hass=${this.hass}
              id="input"
              .type=${"area_id"}
              .label=${this.hass.localize(
                "ui.components.target-picker.add_area_id"
              )}
              no-add
              .deviceFilter=${this.deviceFilter}
              .entityFilter=${this.entityFilter}
              .includeDeviceClasses=${this.includeDeviceClasses}
              .includeDomains=${this.includeDomains}
              .excludeAreas=${ensureArray(this.value?.area_id)}
              @value-changed=${this._targetPicked}
              @click=${this._preventDefault}
            ></ha-area-picker>
          `
        : this._addMode === "device_id"
        ? html`
            <ha-device-picker
              .hass=${this.hass}
              id="input"
              .type=${"device_id"}
              .label=${this.hass.localize(
                "ui.components.target-picker.add_device_id"
              )}
              .deviceFilter=${this.deviceFilter}
              .entityFilter=${this.entityFilter}
              .includeDeviceClasses=${this.includeDeviceClasses}
              .includeDomains=${this.includeDomains}
              .excludeDevices=${ensureArray(this.value?.device_id)}
              @value-changed=${this._targetPicked}
              @click=${this._preventDefault}
            ></ha-device-picker>
          `
        : html`
            <ha-entity-picker
              .hass=${this.hass}
              id="input"
              .type=${"entity_id"}
              .label=${this.hass.localize(
                "ui.components.target-picker.add_entity_id"
              )}
              .entityFilter=${this.entityFilter}
              .includeDeviceClasses=${this.includeDeviceClasses}
              .includeDomains=${this.includeDomains}
              .excludeEntities=${ensureArray(this.value?.entity_id)}
              @value-changed=${this._targetPicked}
              @click=${this._preventDefault}
              allow-custom-entity
            ></ha-entity-picker>
          `}</mwc-menu-surface
    >`;
  }

  private _targetPicked(ev) {
    ev.stopPropagation();
    if (!ev.detail.value) {
      return;
    }
    const value = ev.detail.value;
    const target = ev.currentTarget;

    if (target.type === "entity_id" && !isValidEntityId(value)) {
      return;
    }

    target.value = "";
    if (
      this.value &&
      this.value[target.type] &&
      ensureArray(this.value[target.type]).includes(value)
    ) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: this.value
        ? {
            ...this.value,
            [target.type]: this.value[target.type]
              ? [...ensureArray(this.value[target.type]), value]
              : value,
          }
        : { [target.type]: value },
    });
  }

  private _handleExpand(ev) {
    const target = ev.currentTarget as any;
    const newDevices: string[] = [];
    const newEntities: string[] = [];
    if (target.type === "area_id") {
      Object.values(this.hass.devices).forEach((device) => {
        if (
          device.area_id === target.id &&
          !this.value!.device_id?.includes(device.id) &&
          this._deviceMeetsFilter(device)
        ) {
          newDevices.push(device.id);
        }
      });
      Object.values(this.hass.entities).forEach((entity) => {
        if (
          entity.area_id === target.id &&
          !this.value!.entity_id?.includes(entity.entity_id) &&
          this._entityRegMeetsFilter(entity)
        ) {
          newEntities.push(entity.entity_id);
        }
      });
    } else if (target.type === "device_id") {
      Object.values(this.hass.entities).forEach((entity) => {
        if (
          entity.device_id === target.id &&
          !this.value!.entity_id?.includes(entity.entity_id) &&
          this._entityRegMeetsFilter(entity)
        ) {
          newEntities.push(entity.entity_id);
        }
      });
    } else {
      return;
    }
    let value = this.value;
    if (newEntities.length) {
      value = this._addItems(value, "entity_id", newEntities);
    }
    if (newDevices.length) {
      value = this._addItems(value, "device_id", newDevices);
    }
    value = this._removeItem(value, target.type, target.id);
    fireEvent(this, "value-changed", { value });
  }

  private _handleRemove(ev) {
    const target = ev.currentTarget as any;
    fireEvent(this, "value-changed", {
      value: this._removeItem(this.value, target.type, target.id),
    });
  }

  private _addItems(
    value: this["value"],
    type: string,
    ids: string[]
  ): this["value"] {
    return {
      ...value,
      [type]: value![type] ? ensureArray(value![type])!.concat(ids) : ids,
    };
  }

  private _removeItem(
    value: this["value"],
    type: string,
    id: string
  ): this["value"] {
    const newVal = ensureArray(value![type])!.filter(
      (val) => String(val) !== id
    );
    if (newVal.length) {
      return {
        ...value,
        [type]: newVal,
      };
    }
    const val = { ...value }!;
    delete val[type];
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

  private _deviceMeetsFilter(device: DeviceRegistryEntry): boolean {
    const devEntities = Object.values(this.hass.entities).filter(
      (entity) => entity.device_id === device.id
    );

    if (this.includeDomains) {
      if (!devEntities || !devEntities.length) {
        return false;
      }
      if (
        !devEntities.some((entity) =>
          this.includeDomains!.includes(computeDomain(entity.entity_id))
        )
      ) {
        return false;
      }
    }

    if (this.includeDeviceClasses) {
      if (!devEntities || !devEntities.length) {
        return false;
      }
      if (
        !devEntities.some((entity) => {
          const stateObj = this.hass.states[entity.entity_id];
          if (!stateObj) {
            return false;
          }
          return (
            stateObj.attributes.device_class &&
            this.includeDeviceClasses!.includes(
              stateObj.attributes.device_class
            )
          );
        })
      ) {
        return false;
      }
    }

    if (this.deviceFilter) {
      if (!this.deviceFilter(device)) {
        return false;
      }
    }

    if (this.entityFilter) {
      if (
        !devEntities.some((entity) => {
          const stateObj = this.hass.states[entity.entity_id];
          if (!stateObj) {
            return false;
          }
          return this.entityFilter!(stateObj);
        })
      ) {
        return false;
      }
    }
    return true;
  }

  private _entityRegMeetsFilter(entity: EntityRegistryDisplayEntry): boolean {
    if (entity.entity_category) {
      return false;
    }

    if (
      this.includeDomains &&
      !this.includeDomains.includes(computeDomain(entity.entity_id))
    ) {
      return false;
    }
    if (this.includeDeviceClasses) {
      const stateObj = this.hass.states[entity.entity_id];
      if (!stateObj) {
        return false;
      }
      if (
        !stateObj.attributes.device_class ||
        !this.includeDeviceClasses!.includes(stateObj.attributes.device_class)
      ) {
        return false;
      }
    }

    if (this.entityFilter) {
      const stateObj = this.hass.states[entity.entity_id];
      if (!stateObj) {
        return false;
      }
      if (!this.entityFilter!(stateObj)) {
        return false;
      }
    }
    return true;
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
        margin-left: -14px !important;
        margin-inline-start: -14px !important;
        margin-inline-end: 4px !important;
        direction: var(--direction);
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
      simple-tooltip.expand {
        min-width: 200px;
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
      ha-area-picker {
        display: block;
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-target-picker": HaTargetPicker;
  }
}
