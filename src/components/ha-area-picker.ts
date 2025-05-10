import { mdiClose, mdiMenuDown, mdiShape, mdiTextureBox } from "@mdi/js";
import type { ComboBoxLightOpenedChangedEvent } from "@vaadin/combo-box/vaadin-combo-box-light";
import type { HassEntity } from "home-assistant-js-websocket";
import { LitElement, css, html, nothing, type CSSResultGroup } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { computeAreaName } from "../common/entity/compute_area_name";
import { computeFloorName } from "../common/entity/compute_floor_name";
import { getAreaContext } from "../common/entity/context/get_area_context";
import { debounce } from "../common/util/debounce";
import type { HomeAssistant } from "../types";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./ha-area-combo-box";
import type { HaAreaComboBox } from "./ha-area-combo-box";
import "./ha-combo-box";
import "./ha-combo-box-item";
import type { HaComboBoxItem } from "./ha-combo-box-item";
import "./ha-icon-button";
import "./ha-svg-icon";

@customElement("ha-area-picker")
export class HaAreaPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: Boolean, attribute: "no-add" })
  public noAdd = false;

  /**
   * Show only areas with entities from specific domains.
   * @type {Array}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show no areas with entities of these domains.
   * @type {Array}
   * @attr exclude-domains
   */
  @property({ type: Array, attribute: "exclude-domains" })
  public excludeDomains?: string[];

  /**
   * Show only areas with entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  /**
   * List of areas to be excluded.
   * @type {Array}
   * @attr exclude-areas
   */
  @property({ type: Array, attribute: "exclude-areas" })
  public excludeAreas?: string[];

  @property({ attribute: false })
  public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property({ attribute: false })
  public entityFilter?: (entity: HassEntity) => boolean;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ attribute: "hide-clear-icon", type: Boolean })
  public hideClearIcon = false;

  @query("#anchor") private _anchor?: HaComboBoxItem;

  @query("#input") private _input?: HaAreaComboBox;

  @state() private _opened = false;

  private _renderContent() {
    const areaId = this.value || "";

    if (!areaId) {
      return html`
        <span slot="headline" class="placeholder"
          >${this.placeholder ??
          this.hass.localize("ui.components.area-picker.placeholder")}</span
        >
        <ha-svg-icon class="edit" slot="end" .path=${mdiMenuDown}></ha-svg-icon>
      `;
    }

    const area = this.hass.areas[areaId];

    const showClearIcon =
      !this.required && !this.disabled && !this.hideClearIcon;

    if (!area) {
      return html`
        <ha-svg-icon slot="start" .path=${mdiShape}></ha-svg-icon>
        <span slot="headline">${area}</span>
        ${showClearIcon
          ? html`<ha-icon-button
              class="clear"
              slot="end"
              @click=${this._clear}
              .path=${mdiClose}
            ></ha-icon-button>`
          : nothing}
        <ha-svg-icon class="edit" slot="end" .path=${mdiMenuDown}></ha-svg-icon>
      `;
    }

    const { floor } = getAreaContext(area, this.hass);

    const areaName = area ? computeAreaName(area) : undefined;
    const floorName = floor ? computeFloorName(floor) : undefined;

    const icon = area.icon;

    return html`
      ${icon
        ? html`<ha-icon slot="start" .icon=${icon}></ha-icon>`
        : html`<ha-svg-icon slot="start" .path=${mdiTextureBox}></ha-svg-icon>`}
      <span slot="headline">${areaName}</span>
      ${floorName
        ? html`<span slot="supporting-text">${floorName}</span>`
        : nothing}
      ${showClearIcon
        ? html`<ha-icon-button
            class="clear"
            slot="end"
            @click=${this._clear}
            .path=${mdiClose}
          ></ha-icon-button>`
        : nothing}
      <ha-svg-icon class="edit" slot="end" .path=${mdiMenuDown}></ha-svg-icon>
    `;
  }

  protected render() {
    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      <div class="container">
        ${!this._opened
          ? html`<ha-combo-box-item
              .disabled=${this.disabled}
              id="anchor"
              type="button"
              compact
              @click=${this._showPicker}
            >
              ${this._renderContent()}
            </ha-combo-box-item>`
          : html`<ha-area-combo-box
              id="input"
              .hass=${this.hass}
              .autofocus=${this.autofocus}
              .label=${this.hass.localize("ui.common.search")}
              .value=${this.value}
              .noAdd=${this.noAdd}
              .includeDomains=${this.includeDomains}
              .excludeDomains=${this.excludeDomains}
              .includeDeviceClasses=${this.includeDeviceClasses}
              .entityFilter=${this.entityFilter}
              .excludeAreas=${this.excludeAreas}
              hide-clear-icon
              @opened-changed=${this._debounceOpenedChanged}
              @value-changed=${this._valueChanged}
              @input=${stopPropagation}
            ></ha-area-combo-box>`}
        ${this._renderHelper()}
      </div>
    `;
  }

  private _renderHelper() {
    return this.helper
      ? html`<ha-input-helper-text>${this.helper}</ha-input-helper-text>`
      : nothing;
  }

  private _clear(e) {
    e.stopPropagation();
    this.value = undefined;
    fireEvent(this, "value-changed", { value: undefined });
    fireEvent(this, "change");
  }

  private _valueChanged(e) {
    e.stopPropagation();
    const value = e.detail.value;
    this.value = value;
    fireEvent(this, "value-changed", { value });
    fireEvent(this, "change");
  }

  private async _showPicker() {
    if (this.disabled) {
      return;
    }
    this._opened = true;
    await this.updateComplete;
    this._input?.focus();
    this._input?.open();
  }

  // Multiple calls to _openedChanged can be triggered in quick succession
  // when the menu is opened
  private _debounceOpenedChanged = debounce(
    (ev) => this._openedChanged(ev),
    10
  );

  private async _openedChanged(ev: ComboBoxLightOpenedChangedEvent) {
    const opened = ev.detail.value;
    if (this._opened && !opened) {
      this._opened = false;
      await this.updateComplete;
      this._anchor?.focus();
    }
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        mwc-menu-surface {
          --mdc-menu-min-width: 100%;
        }
        .container {
          position: relative;
          display: block;
        }
        ha-combo-box-item {
          background-color: var(--mdc-text-field-fill-color, whitesmoke);
          border-radius: 4px;
          border-end-end-radius: 0;
          border-end-start-radius: 0;
          --md-list-item-one-line-container-height: 56px;
          --md-list-item-two-line-container-height: 56px;
          --md-list-item-top-space: 8px;
          --md-list-item-bottom-space: 8px;
          --md-list-item-leading-space: 8px;
          --md-list-item-trailing-space: 8px;
          --ha-md-list-item-gap: 8px;
          /* Remove the default focus ring */
          --md-focus-ring-width: 0px;
          --md-focus-ring-duration: 0s;
        }

        /* Add Similar focus style as the text field */
        ha-combo-box-item:after {
          display: block;
          content: "";
          position: absolute;
          pointer-events: none;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          width: 100%;
          background-color: var(
            --mdc-text-field-idle-line-color,
            rgba(0, 0, 0, 0.42)
          );
          transform:
            height 180ms ease-in-out,
            background-color 180ms ease-in-out;
        }

        ha-combo-box-item:focus:after {
          height: 2px;
          background-color: var(--mdc-theme-primary);
        }

        ha-combo-box-item ha-svg-icon[slot="start"] {
          margin: 0 4px;
        }
        .clear {
          margin: 0 -8px;
          --mdc-icon-button-size: 32px;
          --mdc-icon-size: 20px;
        }
        .edit {
          --mdc-icon-size: 20px;
          width: 32px;
        }
        label {
          display: block;
          margin: 0 0 8px;
        }
        .placeholder {
          color: var(--secondary-text-color);
          padding: 0 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-area-picker": HaAreaPicker;
  }
}
