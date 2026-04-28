import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import {
  mdiClose,
  mdiConnection,
  mdiMemory,
  mdiPencil,
  mdiUsb,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDeviceName } from "../../common/entity/compute_device_name";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import type { SerialPortSelector } from "../../data/selector";
import { listSerialPorts, type SerialPort } from "../../data/usb";
import { mdiEsphomeLogo } from "../../resources/esphome-logo-svg";
import { multiTermSortedSearch } from "../../resources/fuseMultiTerm";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../ha-combo-box-item";
import "../ha-generic-picker";
import type { HaGenericPicker } from "../ha-generic-picker";
import "../ha-svg-icon";
import "../ha-icon-button";
import {
  DEFAULT_SEARCH_KEYS,
  type PickerComboBoxItem,
} from "../ha-picker-combo-box";
import "../input/ha-input";

const MANUAL_ENTRY_ID = "__manual_entry__";

const SERIAL_PORTS_REFRESH_INTERVAL = 5000;

type SerialPortType =
  | "recommended"
  | "serial_proxy"
  | "integration"
  | "usb"
  | "embedded"
  | "unnamed"
  | "not_recommended";

const SECTION_ORDER: SerialPortType[] = [
  "recommended",
  "serial_proxy",
  "integration",
  "usb",
  "embedded",
  "unnamed",
  "not_recommended",
];

type BaseSerialPortType =
  | "serial_proxy"
  | "integration"
  | "usb"
  | "embedded"
  | "unnamed";

const TYPE_ICONS: Record<BaseSerialPortType, string> = {
  serial_proxy: mdiEsphomeLogo,
  integration: mdiConnection,
  usb: mdiUsb,
  embedded: mdiMemory,
  unnamed: mdiMemory,
};

const ESPHOME_HASS_SCHEME = "esphome-hass://";

const getBasePortType = (port: SerialPort): BaseSerialPortType => {
  if (port.device.startsWith(ESPHOME_HASS_SCHEME)) {
    return "serial_proxy";
  }
  if (port.device.includes("://")) {
    return "integration";
  }
  if (port.vid || port.pid) {
    return "usb";
  }
  if (port.description || port.manufacturer) {
    return "embedded";
  }
  return "unnamed";
};

interface SerialPickerItem extends PickerComboBoxItem {
  port_type: SerialPortType;
  used_by?: string;
}

const integrationName = (
  localize: HomeAssistant["localize"],
  domain: string
): string => localize(`component.${domain}.title`) || domain;

const getPortType = (
  port: SerialPort,
  recommendedDomains: Set<string>
): SerialPortType => {
  const matchingDomains = port.matching_integrations ?? [];

  // If the current integration matches this port, it is recommended
  if (matchingDomains.some((d) => recommendedDomains.has(d))) {
    return "recommended";
  }

  // If any other integrations match it, the port is not recommended
  if (recommendedDomains.size > 0 && matchingDomains.length > 0) {
    return "not_recommended";
  }

  // Otherwise, classify the port
  return getBasePortType(port);
};

@customElement("ha-selector-serial_port")
export class HaSerialPortSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: SerialPortSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property({ attribute: false }) public context?: Record<string, any>;

  @state() private _serialPorts?: SerialPort[];

  @state() private _manualEntry = false;

  @query("ha-input") private _input?: HTMLElement;

  @query("ha-generic-picker") private _picker?: HaGenericPicker;

  private _refreshTimeout?: number;

  private _pickerOpen = false;

  private _loadInFlight = false;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopRefresh();
  }

  protected firstUpdated(): void {
    if (this._canLoadPorts()) {
      this._loadSerialPorts();
    }
  }

  private _canLoadPorts(): boolean {
    return Boolean(
      this.hass &&
      this.hass.user?.is_admin &&
      isComponentLoaded(this.hass.config, "usb")
    );
  }

  private _stopRefresh(): void {
    if (this._refreshTimeout !== undefined) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = undefined;
    }
  }

  private async _loadSerialPorts(): Promise<void> {
    if (this._loadInFlight) {
      return;
    }
    this._loadInFlight = true;
    try {
      this._serialPorts = await listSerialPorts(this.hass);
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error(err);
      this._serialPorts = undefined;
    } finally {
      this._loadInFlight = false;
    }
    if (this._pickerOpen) {
      this._picker?.refreshItems();
      if (this.isConnected) {
        this._refreshTimeout = window.setTimeout(
          () => this._loadSerialPorts(),
          SERIAL_PORTS_REFRESH_INTERVAL
        );
      }
    }
  }

  private _handlePickerOpened = () => {
    this._pickerOpen = true;
    if (
      this._refreshTimeout === undefined &&
      !this._loadInFlight &&
      this._canLoadPorts()
    ) {
      this._loadSerialPorts();
    }
  };

  private _handlePickerClosed = () => {
    this._pickerOpen = false;
    this._stopRefresh();
  };

  private _buildGroupedItems = memoizeOne(
    (
      ports: SerialPort[],
      language: string,
      devices: HomeAssistant["devices"],
      areas: HomeAssistant["areas"],
      localize: HomeAssistant["localize"],
      recommendedDomains: Set<string>
    ): Record<SerialPortType, SerialPickerItem[]> => {
      const grouped: Record<SerialPortType, SerialPickerItem[]> = {
        recommended: [],
        serial_proxy: [],
        integration: [],
        usb: [],
        embedded: [],
        unnamed: [],
        not_recommended: [],
      };

      for (const port of ports) {
        const type = getPortType(port, recommendedDomains);
        let primary: string;
        let secondary: string | undefined;
        const searchLabels: Record<string, string | null> = {
          device: port.device,
          manufacturer: port.manufacturer,
          description: port.description,
          serial_number: port.serial_number,
        };

        if (type === "serial_proxy") {
          try {
            const url = new URL(port.device);
            primary = url.searchParams.get("port_name") || port.device;
            const configEntryId = url.pathname.replace(/^\/+/, "");
            const device = Object.values(devices).find(
              (d) => d.primary_config_entry === configEntryId
            );
            const deviceName = device ? computeDeviceName(device) : undefined;
            const areaName =
              device && device.area_id
                ? areas[device.area_id]?.name
                : undefined;
            if (deviceName && areaName) {
              secondary = localize(
                "ui.components.selectors.serial_port.device_in_area",
                { device: deviceName, area: areaName }
              );
            } else {
              secondary = deviceName || areaName;
            }
            searchLabels.port_name = primary;
            searchLabels.device_name = deviceName ?? null;
            searchLabels.area_name = areaName ?? null;
          } catch (_err) {
            primary = port.device;
            secondary = undefined;
            searchLabels.port_name = port.device;
          }
        } else {
          primary =
            port.description && port.manufacturer
              ? `${port.description} — ${port.manufacturer}`
              : port.description || port.manufacturer || port.device;

          const parts: string[] = [];
          if (port.description || port.manufacturer) {
            parts.push(port.device);
          }
          if (port.vid && port.pid) {
            parts.push(`${port.vid}:${port.pid}`);
          }
          if (port.serial_number) {
            parts.push(`S/N: ${port.serial_number}`);
          }
          secondary = parts.length ? parts.join(" · ") : undefined;
        }

        let used_by: string | undefined;
        if (type === "not_recommended" && port.matching_integrations.length) {
          const integrations = port.matching_integrations
            .map((d) => integrationName(localize, d))
            .join(", ");
          used_by = localize(
            "ui.components.selectors.serial_port.used_by",
            { integrations }
          );
          searchLabels.used_by = used_by;
        }

        grouped[type].push({
          id: port.device,
          primary,
          secondary,
          icon_path: TYPE_ICONS[getBasePortType(port)],
          search_labels: searchLabels,
          sorting_label: primary,
          port_type: type,
          used_by,
        });
      }

      for (const type of SECTION_ORDER) {
        grouped[type].sort((a, b) =>
          caseInsensitiveStringCompare(
            a.sorting_label!,
            b.sorting_label!,
            language
          )
        );
      }

      return grouped;
    }
  );

  private _sectionLabel(type: SerialPortType): string {
    const key = `ui.components.selectors.serial_port.type.${type}` as const;
    if (type === "recommended" && this._selectorDomain) {
      return this.hass.localize(key, {
        integration: integrationName(this.hass.localize, this._selectorDomain),
      });
    }
    return this.hass.localize(key);
  }

  private get _selectorDomain(): string | undefined {
    return this.context?.handler;
  }

  private _memoRecommendedDomains = memoizeOne(
    (domain: string | undefined, extra: string[] | undefined): Set<string> => {
      const domains = new Set<string>();
      if (domain) {
        domains.add(domain);
      }
      if (extra) {
        for (const d of extra) {
          domains.add(d);
        }
      }
      return domains;
    }
  );

  private get _recommendedDomains(): Set<string> {
    return this._memoRecommendedDomains(
      this._selectorDomain,
      this.selector?.serial_port?.extra_recommended_domains
    );
  }

  private _getPickerItems = (
    searchString?: string,
    section?: string
  ): (PickerComboBoxItem | string)[] | undefined => {
    if (!this._serialPorts) {
      return undefined;
    }

    const grouped = this._buildGroupedItems(
      this._serialPorts,
      this.hass.locale.language,
      this.hass.devices,
      this.hass.areas,
      this.hass.localize,
      this._recommendedDomains
    );

    const items: (PickerComboBoxItem | string)[] = [];
    for (const type of SECTION_ORDER) {
      if (section && section !== type) {
        continue;
      }
      let groupItems: SerialPickerItem[] = grouped[type];
      if (searchString) {
        groupItems = multiTermSortedSearch(
          groupItems,
          searchString,
          DEFAULT_SEARCH_KEYS,
          (item) => item.id
        );
      }
      if (!groupItems.length) {
        continue;
      }
      if (!section) {
        items.push(this._sectionLabel(type));
      }
      items.push(...groupItems);
    }

    return items;
  };

  private _getAdditionalItems = (): PickerComboBoxItem[] => [
    {
      id: MANUAL_ENTRY_ID,
      primary: this.hass.localize(
        "ui.components.selectors.serial_port.enter_manually"
      ),
      icon_path: mdiPencil,
    },
  ];

  private _rowRenderer: RenderItemFunction<PickerComboBoxItem> = (item) => {
    const manual = item.id === MANUAL_ENTRY_ID;
    const { port_type, used_by } = item as SerialPickerItem;
    return html`
      <ha-combo-box-item
        type="button"
        compact
        .borderTop=${manual}
        style=${styleMap({
          marginTop: manual ? "var(--ha-space-3)" : "",
          opacity: port_type === "not_recommended" ? "0.6" : "",
          backgroundColor:
            port_type === "recommended"
              ? "var(--ha-assist-chip-active-container-color)"
              : "",
        })}
      >
        ${item.icon_path
          ? html`<ha-svg-icon
              slot="start"
              .path=${item.icon_path}
            ></ha-svg-icon>`
          : nothing}
        <span slot="headline" style="white-space: normal"
          >${item.primary}</span
        >
        ${used_by
          ? html`<span slot="supporting-text" style="white-space: normal"
              >${used_by}</span
            >`
          : nothing}
        ${item.secondary
          ? html`<span slot="supporting-text" style="white-space: normal"
              >${item.secondary}</span
            >`
          : nothing}
      </ha-combo-box-item>
    `;
  };

  protected render() {
    const usbLoaded = this.hass && isComponentLoaded(this.hass.config, "usb");

    if (!usbLoaded || !this._serialPorts || this._manualEntry) {
      return html`
        <ha-input
          .value=${this.value || ""}
          .placeholder=${this.placeholder || ""}
          .hint=${this.helper}
          .disabled=${this.disabled}
          .label=${this.label || ""}
          .required=${this.required}
          @input=${this._handleInputChange}
          @change=${this._handleInputChange}
        >
          ${this._manualEntry
            ? html`
                <ha-icon-button
                  slot="end"
                  @click=${this._revertToDropdown}
                  .path=${mdiClose}
                ></ha-icon-button>
              `
            : nothing}
        </ha-input>
      `;
    }

    const sections = this._buildSections();

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .value=${this.value}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        .getItems=${this._getPickerItems}
        .getAdditionalItems=${this._getAdditionalItems}
        .rowRenderer=${this._rowRenderer}
        .valueRenderer=${this._valueRenderer}
        .sections=${sections}
        @value-changed=${this._handlePickerChange}
        @picker-opened=${this._handlePickerOpened}
        @picker-closed=${this._handlePickerClosed}
      ></ha-generic-picker>
    `;
  }

  private _valueRenderer = (value: string) => {
    if (!this._serialPorts) {
      return html`<span slot="headline">${value}</span>`;
    }
    const item = Object.values(
      this._buildGroupedItems(
        this._serialPorts,
        this.hass.locale.language,
        this.hass.devices,
        this.hass.areas,
        this.hass.localize,
        this._recommendedDomains
      )
    )
      .flat()
      .find((i) => i.id === value);
    const primary = item?.primary || value;
    const text =
      value.startsWith(ESPHOME_HASS_SCHEME) && item?.secondary
        ? `${primary} (${item.secondary})`
        : primary;
    return html`<span slot="headline">${text}</span>`;
  };

  private _buildSections() {
    if (!this._serialPorts) {
      return undefined;
    }
    const grouped = this._buildGroupedItems(
      this._serialPorts,
      this.hass.locale.language,
      this.hass.devices,
      this.hass.areas,
      this.hass.localize,
      this._recommendedDomains
    );
    return SECTION_ORDER.filter((type) => grouped[type].length).map((type) => ({
      id: type,
      label: this._sectionLabel(type),
    }));
  }

  private async _handlePickerChange(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const value = ev.detail.value;
    if (value === MANUAL_ENTRY_ID) {
      this._manualEntry = true;
      fireEvent(this, "value-changed", { value: undefined });
      await this.updateComplete;
      // Wait for the picker popover to fully close and restore focus
      // before moving focus to our input
      requestAnimationFrame(() => {
        this._input?.focus();
      });
      return;
    }
    fireEvent(this, "value-changed", { value: value || undefined });
  }

  private _handleInputChange(ev: InputEvent) {
    ev.stopPropagation();
    const value = (ev.target as HTMLInputElement).value;
    fireEvent(this, "value-changed", {
      value: value || undefined,
    });
  }

  private _revertToDropdown() {
    this._manualEntry = false;
    const ports = this._serialPorts;
    const firstPort = ports?.[0]?.device;
    fireEvent(this, "value-changed", {
      value: firstPort || undefined,
    });
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
    }
    ha-generic-picker,
    ha-input {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-serial_port": HaSerialPortSelector;
  }
}
