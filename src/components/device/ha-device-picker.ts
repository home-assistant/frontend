import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeAreaName } from "../../common/entity/compute_area_name";
import {
  computeDeviceName,
  computeDeviceNameDisplay,
} from "../../common/entity/compute_device_name";
import { computeDomain } from "../../common/entity/compute_domain";
import { getDeviceContext } from "../../common/entity/context/get_device_context";
import { getConfigEntries, type ConfigEntry } from "../../data/config_entries";
import {
  getDeviceEntityDisplayLookup,
  type DeviceEntityDisplayLookup,
  type DeviceRegistryEntry,
} from "../../data/device_registry";
import { domainToName } from "../../data/integration";
import type { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import "../ha-generic-picker";
import type { HaGenericPicker } from "../ha-generic-picker";
import type { PickerComboBoxItem } from "../ha-picker-combo-box";

export type HaDevicePickerDeviceFilterFunc = (
  device: DeviceRegistryEntry
) => boolean;

export type HaDevicePickerEntityFilterFunc = (entity: HassEntity) => boolean;

interface DevicePickerItem extends PickerComboBoxItem {
  domain?: string;
  domain_name?: string;
}

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
    this._getDevices(
      this.hass.devices,
      this.hass.entities,
      this._configEntryLookup,
      this.includeDomains,
      this.excludeDomains,
      this.includeDeviceClasses,
      this.deviceFilter,
      this.entityFilter,
      this.excludeDevices
    );

  private _getDevices = memoizeOne(
    (
      haDevices: HomeAssistant["devices"],
      haEntities: HomeAssistant["entities"],
      configEntryLookup: Record<string, ConfigEntry>,
      includeDomains: this["includeDomains"],
      excludeDomains: this["excludeDomains"],
      includeDeviceClasses: this["includeDeviceClasses"],
      deviceFilter: this["deviceFilter"],
      entityFilter: this["entityFilter"],
      excludeDevices: this["excludeDevices"]
    ): DevicePickerItem[] => {
      const devices = Object.values(haDevices);
      const entities = Object.values(haEntities);

      let deviceEntityLookup: DeviceEntityDisplayLookup = {};

      if (
        includeDomains ||
        excludeDomains ||
        includeDeviceClasses ||
        entityFilter
      ) {
        deviceEntityLookup = getDeviceEntityDisplayLookup(entities);
      }

      let inputDevices = devices.filter(
        (device) => device.id === this.value || !device.disabled_by
      );

      if (includeDomains) {
        inputDevices = inputDevices.filter((device) => {
          const devEntities = deviceEntityLookup[device.id];
          if (!devEntities || !devEntities.length) {
            return false;
          }
          return deviceEntityLookup[device.id].some((entity) =>
            includeDomains.includes(computeDomain(entity.entity_id))
          );
        });
      }

      if (excludeDomains) {
        inputDevices = inputDevices.filter((device) => {
          const devEntities = deviceEntityLookup[device.id];
          if (!devEntities || !devEntities.length) {
            return true;
          }
          return entities.every(
            (entity) =>
              !excludeDomains.includes(computeDomain(entity.entity_id))
          );
        });
      }

      if (excludeDevices) {
        inputDevices = inputDevices.filter(
          (device) => !excludeDevices!.includes(device.id)
        );
      }

      if (includeDeviceClasses) {
        inputDevices = inputDevices.filter((device) => {
          const devEntities = deviceEntityLookup[device.id];
          if (!devEntities || !devEntities.length) {
            return false;
          }
          return deviceEntityLookup[device.id].some((entity) => {
            const stateObj = this.hass.states[entity.entity_id];
            if (!stateObj) {
              return false;
            }
            return (
              stateObj.attributes.device_class &&
              includeDeviceClasses.includes(stateObj.attributes.device_class)
            );
          });
        });
      }

      if (entityFilter) {
        inputDevices = inputDevices.filter((device) => {
          const devEntities = deviceEntityLookup[device.id];
          if (!devEntities || !devEntities.length) {
            return false;
          }
          return devEntities.some((entity) => {
            const stateObj = this.hass.states[entity.entity_id];
            if (!stateObj) {
              return false;
            }
            return entityFilter(stateObj);
          });
        });
      }

      if (deviceFilter) {
        inputDevices = inputDevices.filter(
          (device) =>
            // We always want to include the device of the current value
            device.id === this.value || deviceFilter!(device)
        );
      }

      const outputDevices = inputDevices.map<DevicePickerItem>((device) => {
        const deviceName = computeDeviceNameDisplay(
          device,
          this.hass,
          deviceEntityLookup[device.id]
        );

        const { area } = getDeviceContext(device, this.hass);

        const areaName = area ? computeAreaName(area) : undefined;

        const configEntry = device.primary_config_entry
          ? configEntryLookup?.[device.primary_config_entry]
          : undefined;

        const domain = configEntry?.domain;
        const domainName = domain
          ? domainToName(this.hass.localize, domain)
          : undefined;

        return {
          id: device.id,
          label: "",
          primary:
            deviceName ||
            this.hass.localize("ui.components.device-picker.unnamed_device"),
          secondary: areaName,
          domain: configEntry?.domain,
          domain_name: domainName,
          search_labels: [deviceName, areaName, domain, domainName].filter(
            Boolean
          ) as string[],
          sorting_label: deviceName || "zzz",
        };
      });

      return outputDevices;
    }
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
