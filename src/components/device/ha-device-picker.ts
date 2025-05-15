import { mdiClose, mdiMenuDown } from "@mdi/js";
import type { ComboBoxLightOpenedChangedEvent } from "@vaadin/combo-box/vaadin-combo-box-light";
import type { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  html,
  LitElement,
  nothing,
  type CSSResultGroup,
  type PropertyValues,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import { computeAreaName } from "../../common/entity/compute_area_name";
import { computeDeviceName } from "../../common/entity/compute_device_name";
import { getDeviceContext } from "../../common/entity/context/get_device_context";
import { debounce } from "../../common/util/debounce";
import { getConfigEntries, type ConfigEntry } from "../../data/config_entries";
import type { DeviceRegistryEntry } from "../../data/device_registry";
import type { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import "../ha-combo-box-item";
import "../ha-icon-button";
import "../ha-input-helper-text";
import type { HaMdListItem } from "../ha-md-list-item";
import "../ha-svg-icon";
import "./ha-device-combo-box";
import type { HaDeviceComboBox } from "./ha-device-combo-box";

export type HaDeviceComboBoxDeviceFilterFunc = (
  device: DeviceRegistryEntry
) => boolean;

export type HaDeviceComboBoxEntityFilterFunc = (entity: HassEntity) => boolean;

@customElement("ha-device-picker")
export class HaDevicePicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ attribute: false, type: Array }) public createDomains?: string[];

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

  /**
   * List of devices to be excluded.
   * @type {Array}
   * @attr exclude-devices
   */
  @property({ type: Array, attribute: "exclude-devices" })
  public excludeDevices?: string[];

  @property({ attribute: false })
  public deviceFilter?: HaDeviceComboBoxDeviceFilterFunc;

  @property({ attribute: false })
  public entityFilter?: HaDeviceComboBoxEntityFilterFunc;

  @property({ attribute: "hide-clear-icon", type: Boolean })
  public hideClearIcon = false;

  @query("#anchor") private _anchor?: HaMdListItem;

  @query("#input") private _input?: HaDeviceComboBox;

  @state() private _opened = false;

  @state() private _configEntryLookup: Record<string, ConfigEntry> = {};

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this._loadConfigEntries();
  }

  private async _loadConfigEntries() {
    const configEntries = await getConfigEntries(this.hass);
    this._configEntryLookup = Object.fromEntries(
      configEntries.map((entry) => [entry.entry_id, entry])
    );
  }

  private _renderContent() {
    const deviceId = this.value || "";

    if (!this.value) {
      return html`
        <span slot="headline" class="placeholder"
          >${this.placeholder ??
          this.hass.localize("ui.components.device-picker.placeholder")}</span
        >
        <ha-svg-icon class="edit" slot="end" .path=${mdiMenuDown}></ha-svg-icon>
      `;
    }

    const device = this.hass.devices[deviceId];

    const showClearIcon =
      !this.required && !this.disabled && !this.hideClearIcon;

    if (!device) {
      return html`
        <span slot="headline">${deviceId}</span>
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

    const { area } = getDeviceContext(device, this.hass);

    const deviceName = device ? computeDeviceName(device) : undefined;
    const areaName = area ? computeAreaName(area) : undefined;

    const primary = deviceName;
    const secondary = areaName;

    const configEntry = device.primary_config_entry
      ? this._configEntryLookup[device.primary_config_entry]
      : undefined;

    return html`
      ${configEntry
        ? html`<img
            slot="start"
            alt=""
            crossorigin="anonymous"
            referrerpolicy="no-referrer"
            src=${brandsUrl({
              domain: configEntry.domain,
              type: "icon",
              darkOptimized: this.hass.themes?.darkMode,
            })}
          />`
        : nothing}
      <span slot="headline">${primary}</span>
      <span slot="supporting-text">${secondary}</span>
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
          : html`<ha-device-combo-box
              id="input"
              .hass=${this.hass}
              .autofocus=${this.autofocus}
              .label=${this.hass.localize("ui.common.search")}
              .value=${this.value}
              .includeDomains=${this.includeDomains}
              .excludeDomains=${this.excludeDomains}
              .includeDeviceClasses=${this.includeDeviceClasses}
              .excludeDevices=${this.excludeDevices}
              .deviceFilter=${this.deviceFilter}
              .entityFilter=${this.entityFilter}
              .configEntryLookup=${this._configEntryLookup}
              hide-clear-icon
              @opened-changed=${this._debounceOpenedChanged}
              @value-changed=${this._valueChanged}
              @input=${stopPropagation}
            ></ha-device-combo-box>`}
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
    "ha-device-picker": HaDevicePicker;
  }
}
