import "@home-assistant/webawesome/dist/components/popover/popover";
import type WaPopover from "@home-assistant/webawesome/dist/components/popover/popover";
// @ts-ignore
import chipStyles from "@material/chips/dist/mdc.chips.min.css";
import { mdiPlaylistPlus } from "@mdi/js";
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
  type TargetType,
  type TargetTypeFloorless,
} from "../data/target";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { showHelperDetailDialog } from "../panels/config/helpers/show-dialog-helper-detail";
import type { HomeAssistant } from "../types";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./ha-bottom-sheet";
import "./ha-button";
import "./ha-input-helper-text";
import "./ha-svg-icon";
import "./target-picker/ha-target-picker-item-group";
import "./target-picker/ha-target-picker-selector";
import "./target-picker/ha-target-picker-value-chip";

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

  @state() private _pickerOpen = false;

  @query(".add-target-wrapper") private _addTargetWrapper?: HTMLDivElement;

  @query("wa-popover") private _pickerPopover?: WaPopover;

  private _newTarget?: { type: TargetType; id: string };

  protected render() {
    if (this.addOnTop) {
      return html` ${this._renderChips()} ${this._renderItems()} `;
    }
    return html` ${this._renderItems()} ${this._renderChips()} `;
  }

  private _renderValueChips() {
    return html`<div class="mdc-chip-set items">
      ${this.value?.floor_id
        ? ensureArray(this.value.floor_id).map(
            (floor_id) => html`
              <ha-target-picker-value-chip
                .hass=${this.hass}
                .type=${"floor"}
                .itemId=${floor_id}
                @remove-target-item=${this._handleRemove}
                @expand-target-item=${this._handleExpand}
              ></ha-target-picker-value-chip>
            `
          )
        : nothing}
      ${this.value?.area_id
        ? ensureArray(this.value.area_id).map(
            (area_id) => html`
              <ha-target-picker-value-chip
                .hass=${this.hass}
                .type=${"area"}
                .itemId=${area_id}
                @remove-target-item=${this._handleRemove}
                @expand-target-item=${this._handleExpand}
              ></ha-target-picker-value-chip>
            `
          )
        : nothing}
      ${this.value?.device_id
        ? ensureArray(this.value.device_id).map(
            (device_id) => html`
              <ha-target-picker-value-chip
                .hass=${this.hass}
                .type=${"device"}
                .itemId=${device_id}
                @remove-target-item=${this._handleRemove}
                @expand-target-item=${this._handleExpand}
              ></ha-target-picker-value-chip>
            `
          )
        : nothing}
      ${this.value?.entity_id
        ? ensureArray(this.value.entity_id).map(
            (entity_id) => html`
              <ha-target-picker-value-chip
                .hass=${this.hass}
                .type=${"entity"}
                .itemId=${entity_id}
                @remove-target-item=${this._handleRemove}
                @expand-target-item=${this._handleExpand}
              ></ha-target-picker-value-chip>
            `
          )
        : nothing}
      ${this.value?.label_id
        ? ensureArray(this.value.label_id).map(
            (label_id) => html`
              <ha-target-picker-value-chip
                .hass=${this.hass}
                .type=${"label"}
                .itemId=${label_id}
                @remove-target-item=${this._handleRemove}
                @expand-target-item=${this._handleExpand}
              ></ha-target-picker-value-chip>
            `
          )
        : nothing}
    </div>`;
  }

  private _renderValueGroups() {
    return html`<div class="item-groups">
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
    </div>`;
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
      ${this.compact ? this._renderValueChips() : this._renderValueGroups()}
    `;
  }

  private _renderChips() {
    return html`
      <div class="add-target-wrapper">
        <ha-button
          id="add-target-button"
          size="small"
          appearance="filled"
          @click=${this._showPicker}
        >
          <ha-svg-icon .path=${mdiPlaylistPlus} slot="start"></ha-svg-icon>
          ${this.hass.localize("ui.components.target-picker.add_target")}
        </ha-button>
        ${!this._narrow
          ? html`
              <wa-popover
                style="--body-width: ${this._addTargetWidth}px;"
                without-arrow
                distance="-4"
                placement="bottom-start"
                for="add-target-button"
                @wa-after-hide=${this._hidePicker}
                auto-size="vertical"
                auto-size-padding="16"
              >
                ${this._renderTargetSelector()}
              </wa-popover>
            `
          : html`<ha-bottom-sheet
              @closed=${this._hidePicker}
              .open=${this._pickerOpen}
              @wa-after-show=${this._showSelector}
              flexcontent
            >
              ${this._renderTargetSelector(true)}
            </ha-bottom-sheet>`}
      </div>
      ${this.helper
        ? html`<ha-input-helper-text .disabled=${this.disabled}
            >${this.helper}</ha-input-helper-text
          >`
        : nothing}
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    this._handleResize();
    window.addEventListener("resize", this._handleResize);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("resize", this._handleResize);
  }

  private _handleResize = () => {
    this._addMode = false;
    this._pickerPopover?.hide();
    this._pickerOpen = false;
    this._narrow =
      window.matchMedia("(max-width: 870px)").matches ||
      window.matchMedia("(max-height: 500px)").matches;
  };

  private _showPicker() {
    this._addTargetWidth = this._addTargetWrapper?.offsetWidth || 0;
    this._pickerOpen = true;
    if (!this._narrow) {
      this._addMode = true;
    }
  }

  // wait for drawer animation to finish
  private _showSelector = () => {
    this._addMode = true;
  };

  private _handleUpdatePickerFilters(ev: CustomEvent<TargetTypeFloorless[]>) {
    this._updatePickerFilters(ev.detail);
  }

  private _updatePickerFilters = (filters: TargetTypeFloorless[]) => {
    this._pickerFilters = filters;
  };

  private _hidePicker() {
    this._pickerOpen = false;
    this._addMode = false;

    if (this._newTarget) {
      this._addTarget(this._newTarget.id, this._newTarget.type);
      this._newTarget = undefined;
    }
  }

  private _renderTargetSelector(dialogMode = false) {
    if (!this._addMode) {
      return nothing;
    }
    return html`
      <ha-target-picker-selector
        .hass=${this.hass}
        @filter-types-changed=${this._handleUpdatePickerFilters}
        .filterTypes=${this._pickerFilters}
        autofocus
        @target-picked=${this._handleTargetPicked}
        @create-domain-picked=${this._handleCreateDomain}
        .targetValue=${this.value}
        .deviceFilter=${this.deviceFilter}
        .entityFilter=${this.entityFilter}
        .includeDomains=${this.includeDomains}
        .includeDeviceClasses=${this.includeDeviceClasses}
        .createDomains=${this.createDomains}
        .mode=${dialogMode ? "dialog" : "popover"}
      ></ha-target-picker-selector>
    `;
  }

  private _addTarget(id: string, type: TargetType) {
    const typeId = `${type}_id`;

    if (typeId === "entity_id" && !isValidEntityId(id)) {
      return;
    }

    if (
      this.value &&
      this.value[typeId] &&
      ensureArray(this.value[typeId]).includes(id)
    ) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: this.value
        ? {
            ...this.value,
            [typeId]: this.value[typeId]
              ? [...ensureArray(this.value[typeId]), id]
              : id,
          }
        : { [typeId]: id },
    });
  }

  private _handleTargetPicked = async (
    ev: CustomEvent<{ type: TargetType; id: string }>
  ) => {
    ev.stopPropagation();

    this._pickerOpen = false;
    this._pickerPopover?.hide();

    if (!ev.detail.type || !ev.detail.id) {
      return;
    }

    // save new target temporarily to add it after dialog closes
    this._newTarget = ev.detail;
  };

  private _handleCreateDomain = (ev: CustomEvent<string>) => {
    this._pickerOpen = false;
    this._pickerPopover?.hide();

    const domain = ev.detail;

    showHelperDetailDialog(this, {
      domain,
      dialogClosedCallback: (item) => {
        if (item.entityId) {
          // prevent error that new entity_id isn't in hass object
          requestAnimationFrame(() => {
            this._addTarget(item.entityId!, "entity");
          });
        }
      },
    });
  };

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

  static get styles(): CSSResultGroup {
    return css`
      .add-target-wrapper {
        display: flex;
        justify-content: flex-start;
        margin-top: var(--ha-space-3);
      }

      wa-popover {
        --wa-space-l: var(--ha-space-0);
      }

      wa-popover::part(body) {
        width: min(max(var(--body-width), 336px), 600px);
        max-width: min(max(var(--body-width), 336px), 600px);
        max-height: 500px;
        height: 70vh;
      }

      ha-bottom-sheet {
        --ha-bottom-sheet-height: 90vh;
        --ha-bottom-sheet-height: calc(100dvh - var(--ha-space-12));
        --ha-bottom-sheet-max-height: var(--ha-bottom-sheet-height);
        --ha-bottom-sheet-max-width: 600px;
        --ha-bottom-sheet-padding: var(--ha-space-0);
        --ha-bottom-sheet-surface-background: var(--card-background-color);
      }

      ${unsafeCSS(chipStyles)}
      .items {
        z-index: 2;
      }
      .mdc-chip-set {
        padding: var(--ha-space-1) var(--ha-space-0);
        gap: var(--ha-space-2);
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
    "expand-target-item": {
      type: string;
      id: string;
    };
    "remove-target-group": string;
  }
}
