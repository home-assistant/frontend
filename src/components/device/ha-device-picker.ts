import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { consume, type ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { transform } from "../../common/decorators/transform";
import { fireEvent } from "../../common/dom/fire_event";
import { computeAreaName } from "../../common/entity/compute_area_name";
import { computeDeviceName } from "../../common/entity/compute_device_name";
import { getDeviceArea } from "../../common/entity/context/get_device_context";
import {
  configEntriesToLookup,
  type ConfigEntry,
} from "../../data/config_entries";
import {
  areasContext,
  configContext,
  configEntriesContext,
  devicesContext,
  entitiesContext,
  internationalizationContext,
  statesContext,
  uiContext,
} from "../../data/context";
import {
  deviceComboBoxKeys,
  getDevices,
  type DevicePickerData,
  type DevicePickerItem,
} from "../../data/device/device_picker";
import type { DeviceRegistryEntry } from "../../data/device/device_registry";
import type { HaEntityPickerEntityFilterFunc } from "../../data/entity/entity";
import { brandsUrl } from "../../util/brands-url";
import "../ha-generic-picker";
import type { HaGenericPicker } from "../ha-generic-picker";

const EMPTY_CONFIG_ENTRY_LOOKUP: Record<string, ConfigEntry> = {};

export type HaDevicePickerDeviceFilterFunc = (
  device: DeviceRegistryEntry
) => boolean;

export type HaDevicePickerEntityFilterFunc = (entity: HassEntity) => boolean;

@customElement("ha-device-picker")
export class HaDevicePicker extends LitElement {
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

  @property({ attribute: false }) public createDomains?: string[];

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

  @consume({ context: devicesContext, subscribe: true })
  private _devices!: ContextType<typeof devicesContext>;

  @consume({ context: areasContext, subscribe: true })
  private _areas!: ContextType<typeof areasContext>;

  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: ContextType<typeof entitiesContext>;

  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: uiContext, subscribe: true })
  private _ui!: ContextType<typeof uiContext>;

  @consume({ context: configContext, subscribe: true })
  private _config!: ContextType<typeof configContext>;

  @state()
  @consume({ context: configEntriesContext, subscribe: true })
  @transform<
    ContextType<typeof configEntriesContext>,
    Record<string, ConfigEntry>
  >({
    transformer: configEntriesToLookup,
  })
  private _configEntryLookup?: Record<string, ConfigEntry>;

  private _getDevicesMemoized = memoizeOne(
    (
      states: ContextType<typeof statesContext>,
      devices: ContextType<typeof devicesContext>,
      areas: ContextType<typeof areasContext>,
      entities: ContextType<typeof entitiesContext>,
      i18n: ContextType<typeof internationalizationContext>,
      configEntryLookup: Record<string, ConfigEntry>,
      includeDomains?: string[],
      excludeDomains?: string[],
      includeDeviceClasses?: string[],
      deviceFilter?: HaDevicePickerDeviceFilterFunc,
      entityFilter?: HaEntityPickerEntityFilterFunc,
      excludeDevices?: string[],
      value?: string
    ) =>
      getDevices(
        {
          areas,
          devices,
          entities,
          states,
          localize: i18n.localize,
          language: i18n.language,
          translationMetadata: i18n.translationMetadata,
        } satisfies DevicePickerData,
        configEntryLookup,
        {
          includeDomains,
          excludeDomains,
          includeDeviceClasses,
          deviceFilter,
          entityFilter,
          excludeDevices,
          value,
        }
      )
  );

  private _getItems = () =>
    this._getDevicesMemoized(
      this._states,
      this._devices,
      this._areas,
      this._entities,
      this._i18n,
      this._configEntryLookup ?? EMPTY_CONFIG_ENTRY_LOOKUP,
      this.includeDomains,
      this.excludeDomains,
      this.includeDeviceClasses,
      this.deviceFilter,
      this.entityFilter,
      this.excludeDevices,
      this.value
    );

  private _valueRenderer = memoizeOne(
    (
      devices: ContextType<typeof devicesContext>,
      areas: ContextType<typeof areasContext>,
      darkMode: boolean,
      hassUrl: string,
      configEntriesLookup: Record<string, ConfigEntry>
    ) =>
      (value: string) => {
        const deviceId = value;
        const device = devices[deviceId];

        if (!device) {
          return html`<span slot="headline">${deviceId}</span>`;
        }

        const area = getDeviceArea(device, areas);

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
                src=${brandsUrl(
                  {
                    domain: configEntry.domain,
                    type: "icon",
                    darkOptimized: darkMode,
                  },
                  hassUrl
                )}
              />`
            : nothing}
          <span slot="headline">${primary}</span>
          <span slot="supporting-text">${secondary}</span>
        `;
      }
  );

  private _rowRenderer: RenderItemFunction<DevicePickerItem> = (item) => html`
    <ha-combo-box-item type="button">
      ${item.domain
        ? html`
            <img
              slot="start"
              alt=""
              crossorigin="anonymous"
              referrerpolicy="no-referrer"
              src=${brandsUrl(
                {
                  domain: item.domain,
                  type: "icon",
                  darkOptimized: this._ui.themes.darkMode,
                },
                this._config.auth.data.hassUrl
              )}
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
      this._i18n.localize("ui.components.device-picker.placeholder");

    const valueRenderer = this._valueRenderer(
      this._devices,
      this._areas,
      this._ui.themes.darkMode,
      this._config.auth.data.hassUrl,
      this._configEntryLookup ?? EMPTY_CONFIG_ENTRY_LOOKUP
    );

    return html`
      <ha-generic-picker
        .autofocus=${this.autofocus}
        .disabled=${this.disabled}
        .helper=${this.helper}
        .label=${this.label}
        .searchLabel=${this.searchLabel}
        .notFoundLabel=${this._notFoundLabel}
        .emptyLabel=${this._i18n.localize(
          "ui.components.device-picker.no_devices"
        )}
        .placeholder=${placeholder}
        .value=${this.value}
        .rowRenderer=${this._rowRenderer}
        .getItems=${this._getItems}
        .hideClearIcon=${this.hideClearIcon}
        .valueRenderer=${valueRenderer}
        .searchKeys=${deviceComboBoxKeys}
        .unknownItemText=${this._i18n.localize(
          "ui.components.device-picker.unknown"
        )}
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

  private _notFoundLabel = (search: string) =>
    this._i18n.localize("ui.components.device-picker.no_match", {
      term: html`<b>‘${search}’</b>`,
    });
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-picker": HaDevicePicker;
  }
}
