import "@home-assistant/webawesome/dist/components/popover/popover";
import type WaPopover from "@home-assistant/webawesome/dist/components/popover/popover";
// @ts-ignore
import chipStyles from "@material/chips/dist/mdc.chips.min.css";
import { mdiPlaylistPlus } from "@mdi/js";
import type { ComboBoxLightOpenedChangedEvent } from "@vaadin/combo-box/vaadin-combo-box-light";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ensureArray } from "../common/array/ensure-array";
import { fireEvent } from "../common/dom/fire_event";
import { isValidEntityId } from "../common/entity/valid_entity_id";
import type { HaEntityPickerEntityFilterFunc } from "../data/entity";
import {
  areaMeetsFilter,
  deviceMeetsFilter,
  entityRegMeetsFilter,
} from "../data/target";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import type { HomeAssistant } from "../types";
import "./device/ha-device-picker";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./entity/ha-entity-picker";
import "./ha-area-floor-picker";
import "./ha-button";
import "./ha-icon-button";
import "./ha-input-helper-text";
import "./ha-label-picker";
import "./ha-svg-icon";
import "./ha-tooltip";
import { showTargetPickerDialog } from "./target-picker/dialog/show-dialog-target-picker";
import "./target-picker/ha-target-picker-chips-selection";
import "./target-picker/ha-target-picker-item-group";
import type { TargetType } from "./target-picker/ha-target-picker-item-row";
import "./target-picker/ha-target-picker-selector";
import type { TargetTypeFloorless } from "./target-picker/ha-target-picker-selector";

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

  @state() private _addMode = false;

  @state() private _addTargetWidth = 0;

  @state() private _narrow = false;

  @state() private _pickerFilters: TargetTypeFloorless[] = [];

  @query("#input") private _inputElement?;

  @query(".add-container", true) private _addContainer?: HTMLDivElement;

  @query(".add-target-wrapper") private _addTargetWrapper?: HTMLDivElement;

  @query("wa-popover") private _addPopover?: WaPopover;

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
                    .deviceFilter=${this.deviceFilter}
                    .entityFilter=${this.entityFilter}
                    .includeDomains=${this.includeDomains}
                    .includeDeviceClasses=${this.includeDeviceClasses}
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
                    .deviceFilter=${this.deviceFilter}
                    .entityFilter=${this.entityFilter}
                    .includeDomains=${this.includeDomains}
                    .includeDeviceClasses=${this.includeDeviceClasses}
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
                    .deviceFilter=${this.deviceFilter}
                    .entityFilter=${this.entityFilter}
                    .includeDomains=${this.includeDomains}
                    .includeDeviceClasses=${this.includeDeviceClasses}
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
                    .deviceFilter=${this.deviceFilter}
                    .entityFilter=${this.entityFilter}
                    .includeDomains=${this.includeDomains}
                    .includeDeviceClasses=${this.includeDeviceClasses}
                  >
                  </ha-target-picker-item-group>
                `
              : nothing}
          </div>`}
    `;
  }

  private _renderChips() {
    return html`
      <div class="add-target-wrapper">
        <ha-button
          id="add-target-button"
          size="small"
          class="add-target"
          appearance="filled"
          @click=${this._showPicker}
        >
          <ha-svg-icon .path=${mdiPlaylistPlus} slot="start"></ha-svg-icon>
          ${this.hass.localize("ui.components.target-picker.add_target")}
        </ha-button>
        ${!this._narrow
          ? html`
              <wa-popover
                style="--body-width: calc(${this._addTargetWidth}px + 16px);"
                without-arrow
                distance="0"
                placement="bottom"
                for="add-target-button"
                @wa-after-hide=${this._hidePicker}
              >
                ${this._addMode
                  ? html`<ha-target-picker-selector
                      .hass=${this.hass}
                      @filter-types-changed=${this._handleUpdatePickerFilters}
                      .filterTypes=${this._pickerFilters}
                      autofocus
                    ></ha-target-picker-selector>`
                  : nothing}
              </wa-popover>
            `
          : nothing}
      </div>
      ${this.helper
        ? html`<ha-input-helper-text .disabled=${this.disabled}
            >${this.helper}</ha-input-helper-text
          >`
        : ""}
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    this._narrow = matchMedia("(max-width: 870px)").matches;
    window.addEventListener("resize", this._setNarrow);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("resize", this._setNarrow);
  }

  private _setNarrow = () => {
    this._narrow = matchMedia("(max-width: 870px)").matches;
  };

  private _showPicker() {
    this._addTargetWidth = this._addTargetWrapper?.offsetWidth || 0;

    if (this._narrow) {
      showTargetPickerDialog(this, {
        target: this.value || {},
        deviceFilter: this.deviceFilter,
        entityFilter: this.entityFilter,
        includeDomains: this.includeDomains,
        includeDeviceClasses: this.includeDeviceClasses,
        selectTarget: () => {
          // TODO
        },
        typeFilter: this._pickerFilters,
        updateTypeFilter: this._updatePickerFilters,
      });
    } else {
      this._addMode = true;
    }
  }

  private _handleUpdatePickerFilters(ev: CustomEvent<TargetTypeFloorless[]>) {
    this._updatePickerFilters(ev.detail);
  }

  private _updatePickerFilters = (filters: TargetTypeFloorless[]) => {
    this._pickerFilters = filters;
  };

  private _hidePicker() {
    this._addMode = false;
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
          newAreas.push(area.area_id);
        }
      });
    } else if (type === "area") {
      Object.values(this.hass.devices).forEach((device) => {
        if (
          device.area_id === itemId &&
          !this.value!.device_id?.includes(device.id) &&
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
          newDevices.push(device.id);
        }
      });
      Object.values(this.hass.entities).forEach((entity) => {
        if (
          entity.area_id === itemId &&
          !this.value!.entity_id?.includes(entity.entity_id) &&
          entityRegMeetsFilter(
            entity,
            false,
            this.includeDomains,
            this.includeDeviceClasses,
            this.hass.states,
            this.entityFilter
          )
        ) {
          newEntities.push(entity.entity_id);
        }
      });
    } else if (type === "device") {
      Object.values(this.hass.entities).forEach((entity) => {
        if (
          entity.device_id === itemId &&
          !this.value!.entity_id?.includes(entity.entity_id) &&
          entityRegMeetsFilter(
            entity,
            false,
            this.includeDomains,
            this.includeDeviceClasses,
            this.hass.states,
            this.entityFilter
          )
        ) {
          newEntities.push(entity.entity_id);
        }
      });
    } else if (type === "label") {
      Object.values(this.hass.areas).forEach((area) => {
        if (
          area.labels.includes(itemId) &&
          !this.value!.area_id?.includes(area.area_id) &&
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
          newAreas.push(area.area_id);
        }
      });
      Object.values(this.hass.devices).forEach((device) => {
        if (
          device.labels.includes(itemId) &&
          !this.value!.device_id?.includes(device.id) &&
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
          newDevices.push(device.id);
        }
      });
      Object.values(this.hass.entities).forEach((entity) => {
        if (
          entity.labels.includes(itemId) &&
          !this.value!.entity_id?.includes(entity.entity_id) &&
          entityRegMeetsFilter(
            entity,
            true,
            this.includeDomains,
            this.includeDeviceClasses,
            this.hass.states,
            this.entityFilter
          )
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
      // this._addMode = undefined;
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      .add-target-wrapper {
        display: flex;
        justify-content: center;
        margin-top: 12px;
      }
      .add-target {
        width: 100%;
        max-width: 304px;
      }

      wa-popover {
        --wa-space-l: 0;
      }

      wa-popover::part(body) {
        width: var(--body-width);
        max-width: var(--body-width);
        max-height: 700px;
        height: 100vh;
        /* TODO height should be variable if less elements are available */
      }

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
