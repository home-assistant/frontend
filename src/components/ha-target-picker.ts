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
import { computeDomain } from "../common/entity/compute_domain";
import { isValidEntityId } from "../common/entity/valid_entity_id";
import type { AreaRegistryEntry } from "../data/area_registry";
import type { DeviceRegistryEntry } from "../data/device_registry";
import type { EntityRegistryDisplayEntry } from "../data/entity_registry";
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
import "./target-picker/ha-target-picker-chips-selection";
import "./target-picker/ha-target-picker-item-group";
import type { TargetType } from "./target-picker/ha-target-picker-item-row";

@customElement("ha-target-picker")
export class HaTargetPicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: HassServiceTarget;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public compact = false;

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
      ${this.compact
        ? html`<div class="mdc-chip-set items">
            ${this.value?.floor_id
              ? ensureArray(this.value.floor_id).map(
                  (floor_id) => html`
                    <ha-target-picker-chips-selection
                      .hass=${this.hass}
                      .type=${"floor"}
                      .itemId=${floor_id}
                      @remove-target-item=${this._handleRemove}
                      @expand-target-item=${this._handleExpand}
                    ></ha-target-picker-chips-selection>
                  `
                )
              : nothing}
            ${this.value?.area_id
              ? ensureArray(this.value.area_id).map(
                  (area_id) => html`
                    <ha-target-picker-chips-selection
                      .hass=${this.hass}
                      .type=${"area"}
                      .itemId=${area_id}
                      @remove-target-item=${this._handleRemove}
                      @expand-target-item=${this._handleExpand}
                    ></ha-target-picker-chips-selection>
                  `
                )
              : nothing}
            ${this.value?.device_id
              ? ensureArray(this.value.device_id).map(
                  (device_id) => html`
                    <ha-target-picker-chips-selection
                      .hass=${this.hass}
                      .type=${"device"}
                      .itemId=${device_id}
                      @remove-target-item=${this._handleRemove}
                      @expand-target-item=${this._handleExpand}
                    ></ha-target-picker-chips-selection>
                  `
                )
              : nothing}
            ${this.value?.entity_id
              ? ensureArray(this.value.entity_id).map(
                  (entity_id) => html`
                    <ha-target-picker-chips-selection
                      .hass=${this.hass}
                      .type=${"entity"}
                      .itemId=${entity_id}
                      @remove-target-item=${this._handleRemove}
                      @expand-target-item=${this._handleExpand}
                    ></ha-target-picker-chips-selection>
                  `
                )
              : nothing}
            ${this.value?.label_id
              ? ensureArray(this.value.label_id).map(
                  (label_id) => html`
                    <ha-target-picker-chips-selection
                      .hass=${this.hass}
                      .type=${"label"}
                      .itemId=${label_id}
                      @remove-target-item=${this._handleRemove}
                      @expand-target-item=${this._handleExpand}
                    ></ha-target-picker-chips-selection>
                  `
                )
              : nothing}
          </div>`
        : html`<div class="item-groups">
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
          </div>`}
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

  private _handleExpand(ev) {
    const type = ev.detail.type;
    const itemId = ev.detail.id;
    const newAreas: string[] = [];
    const newDevices: string[] = [];
    const newEntities: string[] = [];

    if (type === "floor") {
      Object.values(this.hass.areas).forEach((area) => {
        if (
          area.floor_id === itemId &&
          !this.value!.area_id?.includes(area.area_id) &&
          this._areaMeetsFilter(area)
        ) {
          newAreas.push(area.area_id);
        }
      });
    } else if (type === "area") {
      Object.values(this.hass.devices).forEach((device) => {
        if (
          device.area_id === itemId &&
          !this.value!.device_id?.includes(device.id) &&
          this._deviceMeetsFilter(device)
        ) {
          newDevices.push(device.id);
        }
      });
      Object.values(this.hass.entities).forEach((entity) => {
        if (
          entity.area_id === itemId &&
          !this.value!.entity_id?.includes(entity.entity_id) &&
          this._entityRegMeetsFilter(entity)
        ) {
          newEntities.push(entity.entity_id);
        }
      });
    } else if (type === "device") {
      Object.values(this.hass.entities).forEach((entity) => {
        if (
          entity.device_id === itemId &&
          !this.value!.entity_id?.includes(entity.entity_id) &&
          this._entityRegMeetsFilter(entity)
        ) {
          newEntities.push(entity.entity_id);
        }
      });
    } else if (type === "label") {
      Object.values(this.hass.areas).forEach((area) => {
        if (
          area.labels.includes(itemId) &&
          !this.value!.area_id?.includes(area.area_id) &&
          this._areaMeetsFilter(area)
        ) {
          newAreas.push(area.area_id);
        }
      });
      Object.values(this.hass.devices).forEach((device) => {
        if (
          device.labels.includes(itemId) &&
          !this.value!.device_id?.includes(device.id) &&
          this._deviceMeetsFilter(device)
        ) {
          newDevices.push(device.id);
        }
      });
      Object.values(this.hass.entities).forEach((entity) => {
        if (
          entity.labels.includes(itemId) &&
          !this.value!.entity_id?.includes(entity.entity_id) &&
          this._entityRegMeetsFilter(entity, true)
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
    if (newAreas.length) {
      value = this._addItems(value, "area_id", newAreas);
    }
    value = this._removeItem(value, type, itemId);
    fireEvent(this, "value-changed", { value });
  }

  private _areaMeetsFilter(area: AreaRegistryEntry): boolean {
    const areaDevices = Object.values(this.hass.devices).filter(
      (device) => device.area_id === area.area_id
    );

    if (areaDevices.some((device) => this._deviceMeetsFilter(device))) {
      return true;
    }

    const areaEntities = Object.values(this.hass.entities).filter(
      (entity) => entity.area_id === area.area_id
    );

    if (areaEntities.some((entity) => this._entityRegMeetsFilter(entity))) {
      return true;
    }

    return false;
  }

  private _deviceMeetsFilter(device: DeviceRegistryEntry): boolean {
    const devEntities = Object.values(this.hass.entities).filter(
      (entity) => entity.device_id === device.id
    );

    if (!devEntities.some((entity) => this._entityRegMeetsFilter(entity))) {
      return false;
    }

    if (this.deviceFilter) {
      if (!this.deviceFilter(device)) {
        return false;
      }
    }

    return true;
  }

  private _entityRegMeetsFilter(
    entity: EntityRegistryDisplayEntry,
    includeSecondary = false
  ): boolean {
    if (entity.hidden || (entity.entity_category && !includeSecondary)) {
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
        gap: 8px;
      }
      .mdc-chip-set .mdc-chip {
        margin: 0;
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
      .mdc-chip__icon.mdc-chip__icon--2 {
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

      .item-groups {
        overflow: hidden;
        border: 2px solid var(--divider-color);
        border-radius: var(--ha-border-radius-lg);
      }

      :host([compact]) .mdc-chip.area_id:not(.add),
      .mdc-chip.floor_id:not(.add) {
        border: 1px solid #fed6a4;
        background: var(--card-background-color);
      }
      :host([compact]) .mdc-chip.area_id.add,
      :host([compact]) .mdc-chip.floor_id.add {
        background: #fed6a4;
      }
      :host([compact]) .mdc-chip.device_id.add {
        background: #a8e1fb;
      }
      :host([compact]) .mdc-chip.entity_id.add {
        background: #d2e7b9;
      }
      :host([compact]) .mdc-chip.label_id.add {
        background: var(--background-color, #e0e0e0);
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
    "expand-target-item": {
      type: string;
      id: string;
    };
    "remove-target-group": string;
  }
}
