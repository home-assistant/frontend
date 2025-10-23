import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeAreaName } from "../../common/entity/compute_area_name";
import { computeDeviceName } from "../../common/entity/compute_device_name";
import { getDeviceContext } from "../../common/entity/context/get_device_context";
import { getConfigEntries, type ConfigEntry } from "../../data/config_entries";
import {
  getDevices,
  type DevicePickerItem,
  type DeviceRegistryEntry,
} from "../../data/device_registry";
import type { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import "../ha-generic-picker";
import type { HaGenericPicker } from "../ha-generic-picker";

export type HaDevicePickerDeviceFilterFunc = (
  device: DeviceRegistryEntry
) => boolean;

export type HaDevicePickerEntityFilterFunc = (entity: HassEntity) => boolean;

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

  @property({ type: String, attribute: "search-label" })
  public searchLabel?: string;

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
  public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property({ attribute: false })
  public entityFilter?: HaDevicePickerEntityFilterFunc;

  @property({ attribute: "hide-clear-icon", type: Boolean })
  public hideClearIcon = false;

  @query("ha-generic-picker") private _picker?: HaGenericPicker;

  @state() private _configEntryLookup: Record<string, ConfigEntry> = {};

  private _getDevicesMemoized = memoizeOne(getDevices);

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

  private _getItems = () =>
    this._getDevicesMemoized(
      this.hass,
      this._configEntryLookup,
      this.includeDomains,
      this.excludeDomains,
      this.includeDeviceClasses,
      this.deviceFilter,
      this.entityFilter,
      this.excludeDevices,
      this.value
    );

  private _valueRenderer = memoizeOne(
    (configEntriesLookup: Record<string, ConfigEntry>) => (value: string) => {
      const deviceId = value;
      const device = this.hass.devices[deviceId];

      if (!device) {
        return html`<span slot="headline">${deviceId}</span>`;
      }

      const { area } = getDeviceContext(device, this.hass);

      const deviceName = device ? computeDeviceName(device) : undefined;
      const areaName = area ? computeAreaName(area) : undefined;

      const primary = deviceName;
      const secondary = areaName;

      const configEntry = device.primary_config_entry
        ? configEntriesLookup[device.primary_config_entry]
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
      `;
    }
  );

  private _rowRenderer: ComboBoxLitRenderer<DevicePickerItem> = (item) => html`
    <ha-combo-box-item type="button">
      ${item.domain
        ? html`
            <img
              slot="start"
              alt=""
              crossorigin="anonymous"
              referrerpolicy="no-referrer"
              src=${brandsUrl({
                domain: item.domain,
                type: "icon",
                darkOptimized: this.hass.themes.darkMode,
              })}
            />
          `
        : nothing}

      <span slot="headline">${item.primary}</span>
      ${item.secondary
        ? html`<span slot="supporting-text">${item.secondary}</span>`
        : nothing}
      ${item.domain_name
        ? html`
            <div slot="trailing-supporting-text" class="domain">
              ${item.domain_name}
            </div>
          `
        : nothing}
    </ha-combo-box-item>
  `;

  protected render() {
    const placeholder =
      this.placeholder ??
      this.hass.localize("ui.components.device-picker.placeholder");
    const notFoundLabel = this.hass.localize(
      "ui.components.device-picker.no_match"
    );

    const valueRenderer = this._valueRenderer(this._configEntryLookup);

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .autofocus=${this.autofocus}
        .label=${this.label}
        .searchLabel=${this.searchLabel}
        .notFoundLabel=${notFoundLabel}
        .placeholder=${placeholder}
        .value=${this.value}
        .rowRenderer=${this._rowRenderer}
        .getItems=${this._getItems}
        .hideClearIcon=${this.hideClearIcon}
        .valueRenderer=${valueRenderer}
        @value-changed=${this._valueChanged}
      >
      </ha-generic-picker>
    `;
  }

  public async open() {
    await this.updateComplete;
    await this._picker?.open();
  }

  private _valueChanged(ev) {
    ev.stopPropagation();
    const value = ev.detail.value;
    this.value = value;
    fireEvent(this, "value-changed", { value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-picker": HaDevicePicker;
  }
}
