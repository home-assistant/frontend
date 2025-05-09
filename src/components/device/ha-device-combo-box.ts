import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import Fuse from "fuse.js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeAreaName } from "../../common/entity/compute_area_name";
import { computeDeviceNameDisplay } from "../../common/entity/compute_device_name";
import { computeDomain } from "../../common/entity/compute_domain";
import { getDeviceContext } from "../../common/entity/context/get_device_context";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import type {
  DeviceEntityDisplayLookup,
  DeviceRegistryEntry,
} from "../../data/device_registry";
import { getDeviceEntityDisplayLookup } from "../../data/device_registry";
import type { EntityRegistryDisplayEntry } from "../../data/entity_registry";
import { HaFuse } from "../../resources/fuse";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../ha-combo-box";
import type { HaComboBox } from "../ha-combo-box";
import "../ha-combo-box-item";
import { getConfigEntries, type ConfigEntry } from "../../data/config_entries";
import { brandsUrl } from "../../util/brands-url";
import { domainToName } from "../../data/integration";

interface DeviceComboBoxItem {
  // Force empty label to always display empty value by default in the search field
  id: string;
  label: "";
  primary: string;
  secondary?: string;
  domain?: string;
  domain_name?: string;
  search_labels?: string[];
  sorting_label?: string;
}

export type HaDeviceComboBoxDeviceFilterFunc = (
  device: DeviceRegistryEntry
) => boolean;

export type HaDeviceComboBoxEntityFilterFunc = (entity: HassEntity) => boolean;

const NO_DEVICES = "___no-devices___";

@customElement("ha-device-combo-box")
export class HaDeviceComboBox extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

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

  public async open() {
    await this.updateComplete;
    await this.comboBox?.open();
  }

  public async focus() {
    await this.updateComplete;
    await this.comboBox?.focus();
  }

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ attribute: "hide-clear-icon", type: Boolean })
  public hideClearIcon = false;

  @property({ attribute: false })
  public configEntryLookup?: Record<string, ConfigEntry>;

  @state() private _opened?: boolean;

  @query("ha-combo-box", true) public comboBox!: HaComboBox;

  private _initialItems = false;

  private _items: DeviceComboBoxItem[] = [];

  private _getItems = memoizeOne(
    (
      devices: DeviceRegistryEntry[],
      entities: EntityRegistryDisplayEntry[],
      configEntryLookup: this["configEntryLookup"],
      includeDomains: this["includeDomains"],
      excludeDomains: this["excludeDomains"],
      includeDeviceClasses: this["includeDeviceClasses"],
      deviceFilter: this["deviceFilter"],
      entityFilter: this["entityFilter"],
      excludeDevices: this["excludeDevices"]
    ): DeviceComboBoxItem[] => {
      if (!devices.length) {
        return [
          {
            label: "",
            id: NO_DEVICES,
            primary: this.hass.localize(
              "ui.components.device-picker.no_devices"
            ),
          },
        ];
      }

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

      const outputDevices = inputDevices
        .map<DeviceComboBoxItem>((device) => {
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
        })
        .sort((entityA, entityB) =>
          caseInsensitiveStringCompare(
            entityA.sorting_label!,
            entityB.sorting_label!,
            this.hass.locale.language
          )
        );

      if (!outputDevices.length) {
        return [
          {
            id: NO_DEVICES,
            label: "",
            primary: this.hass.localize("ui.components.device-picker.no_match"),
          },
        ];
      }
      return outputDevices;
    }
  );

  public firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (this.configEntryLookup) {
      return;
    }
    this._loadConfigEntries();
    this.hass.loadBackendTranslation("title");
  }

  private _rowRenderer: ComboBoxLitRenderer<DeviceComboBoxItem> = (
    item
  ) => html`
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

  private async _loadConfigEntries() {
    const configEntries = await getConfigEntries(this.hass);
    this.configEntryLookup = Object.fromEntries(
      configEntries.map((entry) => [entry.entry_id, entry])
    );
  }

  public willUpdate(changedProps: PropertyValues) {
    if (!this._initialItems || (changedProps.has("_opened") && this._opened)) {
      this._items = this._getItems(
        Object.values(this.hass.devices),
        Object.values(this.hass.entities),
        this.configEntryLookup,
        this.includeDomains,
        this.excludeDomains,
        this.includeDeviceClasses,
        this.deviceFilter,
        this.entityFilter,
        this.excludeDevices
      );
      this._initialItems = true;
    }
  }

  protected shouldUpdate(changedProps: PropertyValues) {
    if (
      changedProps.has("value") ||
      changedProps.has("label") ||
      changedProps.has("disabled")
    ) {
      return true;
    }
    return !(!changedProps.has("_opened") && this._opened);
  }

  protected render(): TemplateResult {
    return html`
      <ha-combo-box
        item-value-path="id"
        .hass=${this.hass}
        .value=${this._value}
        .label=${this.label === undefined && this.hass
          ? this.hass.localize("ui.components.device-picker.device")
          : this.label}
        .helper=${this.helper}
        .filteredItems=${this._items}
        .renderer=${this._rowRenderer}
        .disabled=${this.disabled}
        .required=${this.required}
        .hideClearIcon=${this.hideClearIcon}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._valueChanged}
        @filter-changed=${this._filterChanged}
      ></ha-combo-box>
    `;
  }

  private get _value() {
    return this.value || "";
  }

  private _fuseIndex = memoizeOne((states: DeviceComboBoxItem[]) =>
    Fuse.createIndex(["search_labels"], states)
  );

  private _filterChanged(ev: CustomEvent): void {
    if (!this._opened) return;

    const target = ev.target as HaComboBox;
    const filterString = ev.detail.value.trim().toLowerCase() as string;

    const index = this._fuseIndex(this._items);
    const fuse = new HaFuse(this._items, {}, index);

    const results = fuse.multiTermsSearch(filterString);
    if (results) {
      if (results.length === 0) {
        target.filteredItems = [
          {
            id: NO_DEVICES,
            label: "",
            primary: this.hass!.localize(
              "ui.components.device-picker.no_match"
            ),
          },
        ] as DeviceComboBoxItem[];
      } else {
        target.filteredItems = results.map((result) => result.item);
      }
    } else {
      target.filteredItems = this._items;
    }
  }

  private _valueChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    // Clear the input field to prevent showing the old value next time
    this.comboBox.setTextFieldValue("");
    const newValue = ev.detail.value;

    if (newValue !== this._value) {
      this._setValue(newValue);
    }
  }

  private _openedChanged(ev: ValueChangedEvent<boolean>) {
    this._opened = ev.detail.value;
  }

  private _setValue(value: string) {
    if (!value) {
      return;
    }
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
    }, 0);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-combo-box": HaDeviceComboBox;
  }
}
