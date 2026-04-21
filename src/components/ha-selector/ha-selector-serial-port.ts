import { mdiClose, mdiConnection, mdiMemory, mdiPencil, mdiUsb } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
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

type SerialPortType = "integration" | "usb" | "embedded" | "unnamed";

const SECTION_ORDER: SerialPortType[] = [
  "integration",
  "usb",
  "embedded",
  "unnamed",
];

const TYPE_ICONS: Record<SerialPortType, string> = {
  integration: mdiConnection,
  usb: mdiUsb,
  embedded: mdiMemory,
  unnamed: mdiMemory,
};

const getPortType = (port: SerialPort): SerialPortType => {
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

const getPortIcon = (port: SerialPort, type: SerialPortType): string => {
  if (type === "integration" && port.device.startsWith("esphome://")) {
    return mdiEsphomeLogo;
  }
  return TYPE_ICONS[type];
};

const getPortPrimary = (port: SerialPort): string => {
  if (port.description && port.manufacturer) {
    return `${port.description} — ${port.manufacturer}`;
  }
  return port.description || port.manufacturer || port.device;
};

const getPortSecondary = (port: SerialPort): string | undefined => {
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
  return parts.length ? parts.join(" · ") : undefined;
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
      language: string
    ): Record<SerialPortType, PickerComboBoxItem[]> => {
      const grouped: Record<SerialPortType, PickerComboBoxItem[]> = {
        integration: [],
        usb: [],
        embedded: [],
        unnamed: [],
      };

      for (const port of ports) {
        const type = getPortType(port);
        const primary = getPortPrimary(port);
        grouped[type].push({
          id: port.device,
          primary,
          secondary: getPortSecondary(port),
          icon_path: getPortIcon(port, type),
          search_labels: {
            device: port.device,
            manufacturer: port.manufacturer,
            description: port.description,
            serial_number: port.serial_number,
          },
          sorting_label: primary,
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

  private _getPickerItems = (
    searchString?: string,
    section?: string
  ): (PickerComboBoxItem | string)[] | undefined => {
    if (!this._serialPorts) {
      return undefined;
    }

    const grouped = this._buildGroupedItems(
      this._serialPorts,
      this.hass.locale.language
    );

    const items: (PickerComboBoxItem | string)[] = [];
    for (const type of SECTION_ORDER) {
      if (section && section !== type) {
        continue;
      }
      let groupItems = grouped[type];
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
        items.push(
          this.hass.localize(
            `ui.components.selectors.serial_port.type.${type}` as const
          )
        );
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

  private _rowRenderer = (item: PickerComboBoxItem) => html`
    <ha-combo-box-item type="button" compact>
      ${item.icon_path
        ? html`<ha-svg-icon slot="start" .path=${item.icon_path}></ha-svg-icon>`
        : nothing}
      <span slot="headline">${item.primary}</span>
      ${item.secondary
        ? html`<span slot="supporting-text">${item.secondary}</span>`
        : nothing}
    </ha-combo-box-item>
  `;

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
        .sections=${sections}
        @value-changed=${this._handlePickerChange}
        @picker-opened=${this._handlePickerOpened}
        @picker-closed=${this._handlePickerClosed}
      ></ha-generic-picker>
    `;
  }

  private _buildSections() {
    if (!this._serialPorts) {
      return undefined;
    }
    const grouped = this._buildGroupedItems(
      this._serialPorts,
      this.hass.locale.language
    );
    return SECTION_ORDER.filter((type) => grouped[type].length).map((type) => ({
      id: type,
      label: this.hass.localize(
        `ui.components.selectors.serial_port.type.${type}` as const
      ),
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
