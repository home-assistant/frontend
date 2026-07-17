import { mdiAlertOutline } from "@mdi/js";
import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeAreaName } from "../../common/entity/compute_area_name";
import { computeDeviceName } from "../../common/entity/compute_device_name";
import { getDeviceArea } from "../../common/entity/context/get_device_context";
import { getConfigEntries, type ConfigEntry } from "../../data/config_entries";
import {
  deviceComboBoxKeys,
  getDevices,
  type DevicePickerItem,
} from "../../data/device/device_picker";
import {
  fetchDeviceCompositeSplits,
  type DeviceCompositeSplits,
  type DeviceRegistryEntry,
} from "../../data/device/device_registry";
import type { HaEntityPickerEntityFilterFunc } from "../../data/entity/entity";
import type { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import "../ha-alert";
import "../ha-button";
import "../ha-generic-picker";
import type { HaGenericPicker } from "../ha-generic-picker";
import "../ha-svg-icon";
import { showDeviceReplacedDialog } from "./show-dialog-device-replaced";

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

  @state() private _configEntryLookup: Record<string, ConfigEntry> = {};

  @state() private _compositeSplits?: DeviceCompositeSplits;

  private _loadingCompositeSplits = false;

  private _getDevicesMemoized = memoizeOne(
    (
      _devices: HomeAssistant["devices"],
      configEntryLookup: Record<string, ConfigEntry>,
      includeDomains?: string[],
      excludeDomains?: string[],
      includeDeviceClasses?: string[],
      deviceFilter?: HaDevicePickerDeviceFilterFunc,
      entityFilter?: HaEntityPickerEntityFilterFunc,
      excludeDevices?: string[],
      value?: string
    ) =>
      getDevices(this.hass, configEntryLookup, {
        includeDomains,
        excludeDomains,
        includeDeviceClasses,
        deviceFilter,
        entityFilter,
        excludeDevices,
        value,
      })
  );

  protected firstUpdated(_changedProperties: PropertyValues<this>): void {
    super.firstUpdated(_changedProperties);
    this._loadConfigEntries();
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (
      !this.hass ||
      !this.value ||
      this._compositeSplits !== undefined ||
      this._loadingCompositeSplits
    ) {
      return;
    }
    const oldHass = changedProperties.get("hass") as HomeAssistant | undefined;
    const devicesChanged =
      changedProperties.has("hass") && this.hass.devices !== oldHass?.devices;
    if (
      (changedProperties.has("value") || devicesChanged) &&
      !this.hass.devices[this.value]
    ) {
      // The selected device is not in the registry; it might be a legacy
      // composite device that was split into separate devices. Fetch the
      // split map so we can offer to replace the reference.
      this._loadCompositeSplits();
    }
  }

  private async _loadConfigEntries() {
    const configEntries = await getConfigEntries(this.hass);
    this._configEntryLookup = Object.fromEntries(
      configEntries.map((entry) => [entry.entry_id, entry])
    );
  }

  private async _loadCompositeSplits() {
    this._loadingCompositeSplits = true;
    try {
      this._compositeSplits = await fetchDeviceCompositeSplits(this.hass);
    } catch (_err) {
      this._compositeSplits = {};
    } finally {
      this._loadingCompositeSplits = false;
    }
  }

  private _getReplacement = memoizeOne(
    (
      value: string | undefined,
      _devices: HomeAssistant["devices"],
      compositeSplits: DeviceCompositeSplits | undefined,
      items: (DevicePickerItem | string)[]
    ) => {
      if (!value || !compositeSplits || this.hass.devices[value]) {
        return undefined;
      }
      const split = compositeSplits[value];
      if (!split) {
        return undefined;
      }
      // Keep only the split devices that pass this picker's filters. In
      // practice usually exactly one of the split devices matches.
      const selectableIds = new Set(
        items
          .filter((item): item is DevicePickerItem => typeof item !== "string")
          .map((item) => item.id)
      );
      const candidates = split.split_ids.filter((id) => selectableIds.has(id));
      return { candidates, primaryId: split.primary_id };
    }
  );

  private _getItems = () =>
    this._getDevicesMemoized(
      this.hass.devices,
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
    (
      configEntriesLookup: Record<string, ConfigEntry>,
      compositeSplits: DeviceCompositeSplits | undefined
    ) =>
      (value: string) => {
        const deviceId = value;
        const device = this.hass.devices[deviceId];

        if (!device) {
          const split = compositeSplits?.[deviceId];
          if (split) {
            // Show the primary replacement device's name, falling back to the
            // first still-existing split device if the primary was deleted.
            const replacementDevice =
              (split.primary_id && this.hass.devices[split.primary_id]) ||
              split.split_ids
                .map((id) => this.hass.devices[id])
                .find((dev) => dev);
            const primaryName = replacementDevice
              ? computeDeviceName(replacementDevice)
              : this.hass.localize(
                  "ui.components.device-picker.device_replaced"
                );
            return html`
              <ha-svg-icon
                slot="start"
                style="color: var(--warning-color)"
                .path=${mdiAlertOutline}
              ></ha-svg-icon>
              <span slot="headline">${primaryName}</span>
            `;
          }
          return html`<span slot="headline">${deviceId}</span>`;
        }

        const area = getDeviceArea(device, this.hass.areas);

        const deviceName = device ? computeDeviceName(device) : undefined;
        const areaName = area ? computeAreaName(area) : undefined;

        const primary = deviceName;
        const secondary = areaName;

        const configEntry = device.primary_config_entry
          ? configEntriesLookup[device.primary_config_entry]
          : undefined;

        return html`
          ${
            configEntry
              ? html`<img
                  slot="start"
                  alt=""
                  crossorigin="anonymous"
                  referrerpolicy="no-referrer"
                  src=${brandsUrl(
                    {
                      domain: configEntry.domain,
                      type: "icon",
                      darkOptimized: this.hass.themes?.darkMode,
                    },
                    this.hass.auth.data.hassUrl
                  )}
                />`
              : nothing
          }
          <span slot="headline">${primary}</span>
          <span slot="supporting-text">${secondary}</span>
        `;
      }
  );

  private _rowRenderer: RenderItemFunction<DevicePickerItem> = (item) => html`
    <ha-combo-box-item type="button">
      ${
        item.domain
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
                    darkOptimized: this.hass.themes.darkMode,
                  },
                  this.hass.auth.data.hassUrl
                )}
              />
            `
          : nothing
      }

      <span slot="headline">${item.primary}</span>
      ${
        item.secondary
          ? html`<span slot="supporting-text">${item.secondary}</span>`
          : nothing
      }
      ${
        item.domain_name
          ? html`
              <div slot="trailing-supporting-text" class="domain">
                ${item.domain_name}
              </div>
            `
          : nothing
      }
    </ha-combo-box-item>
  `;

  protected render() {
    const placeholder =
      this.placeholder ??
      this.hass.localize("ui.components.device-picker.placeholder");

    const valueRenderer = this._valueRenderer(
      this._configEntryLookup,
      this._compositeSplits
    );

    const replacement = this._getReplacement(
      this.value,
      this.hass.devices,
      this._compositeSplits,
      this._getItems()
    );

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .autofocus=${this.autofocus}
        .disabled=${this.disabled}
        .helper=${this.helper}
        .label=${this.label}
        .searchLabel=${this.searchLabel}
        .notFoundLabel=${this._notFoundLabel}
        .emptyLabel=${this.hass.localize(
          "ui.components.device-picker.no_devices"
        )}
        .placeholder=${placeholder}
        .value=${this.value}
        .rowRenderer=${this._rowRenderer}
        .getItems=${this._getItems}
        .hideClearIcon=${this.hideClearIcon}
        .valueRenderer=${valueRenderer}
        .searchKeys=${deviceComboBoxKeys}
        .unknownItemText=${
          replacement?.candidates.length
            ? this.hass.localize(
                "ui.components.device-picker.device_replaced_count",
                { count: replacement.candidates.length }
              )
            : this.hass.localize("ui.components.device-picker.unknown")
        }
        @value-changed=${this._valueChanged}
      >
      </ha-generic-picker>
      ${replacement ? this._renderReplacedAlert(replacement) : nothing}
    `;
  }

  private _renderReplacedAlert(replacement: {
    candidates: string[];
    primaryId: string | null;
  }) {
    const { candidates } = replacement;

    if (!candidates.length) {
      // The device was split, but none of the split devices match this
      // picker's filters. Nothing to replace it with here.
      return html`
        <ha-alert alert-type="warning">
          ${this.hass.localize(
            "ui.components.device-picker.device_replaced_no_match"
          )}
        </ha-alert>
      `;
    }

    const replacementName =
      candidates.length === 1
        ? computeDeviceName(this.hass.devices[candidates[0]])
        : undefined;

    return html`
      <ha-alert alert-type="warning">
        ${
          replacementName
            ? this.hass.localize(
                "ui.components.device-picker.device_replaced_by_one",
                { device: replacementName }
              )
            : this.hass.localize(
                "ui.components.device-picker.device_replaced_by_multiple",
                { count: candidates.length }
              )
        }
        <ha-button
          slot="action"
          appearance="plain"
          @click=${this._handleReplace}
        >
          ${this.hass.localize("ui.components.device-picker.replace_device")}
        </ha-button>
      </ha-alert>
    `;
  }

  private _handleReplace = () => {
    const replacement = this._getReplacement(
      this.value,
      this.hass.devices,
      this._compositeSplits,
      this._getItems()
    );
    if (!replacement?.candidates.length) {
      return;
    }
    const { candidates, primaryId } = replacement;
    if (candidates.length === 1) {
      this._setValue(candidates[0]);
      return;
    }
    showDeviceReplacedDialog(this, {
      originalDeviceId: this.value!,
      candidates,
      primaryId,
      onResolved: (deviceId) => this._setValue(deviceId),
    });
  };

  private _setValue(value: string) {
    this.value = value;
    fireEvent(this, "value-changed", { value });
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
    this.hass.localize("ui.components.device-picker.no_match", {
      term: html`<b>‘${search}’</b>`,
    });

  static styles = css`
    ha-alert {
      display: block;
      margin-top: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-picker": HaDevicePicker;
  }
}
