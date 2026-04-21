import { mdiClose } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import type { SerialSelector } from "../../data/selector";
import { listSerialPorts, type SerialPort } from "../../data/usb";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../ha-generic-picker";
import type { HaGenericPicker } from "../ha-generic-picker";
import type { PickerComboBoxItem } from "../ha-picker-combo-box";
import "../ha-icon-button";
import "../input/ha-input";

const MANUAL_ENTRY_ID = "__manual_entry__";

const SERIAL_PORTS_REFRESH_INTERVAL = 5000;

@customElement("ha-selector-serial")
export class HaSerialSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: SerialSelector;

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

  private _humanReadablePort(port: SerialPort): string {
    const parts: string[] = [port.device];
    if (port.manufacturer) {
      parts.push(port.manufacturer);
    }
    if (port.description) {
      parts.push(port.description);
    }
    return parts.join(" - ");
  }

  private _getPickerItems = (): (PickerComboBoxItem | string)[] | undefined =>
    this._serialPorts
      ? this._getItems(this._serialPorts, this.hass.localize)
      : undefined;

  private _getItems = memoizeOne(
    (
      ports: SerialPort[],
      localize: HomeAssistant["localize"]
    ): (PickerComboBoxItem | string)[] => {
      const items: (PickerComboBoxItem | string)[] = ports.map((port) => ({
        id: port.device,
        primary: this._humanReadablePort(port),
        secondary: port.vid
          ? `${port.vid}:${port.pid}${port.serial_number ? ` - S/N: ${port.serial_number}` : ""}`
          : undefined,
        search_labels: {
          device: port.device,
          manufacturer: port.manufacturer,
          description: port.description,
          serial_number: port.serial_number,
        },
        sorting_label: port.device,
      }));
      items.push({
        id: MANUAL_ENTRY_ID,
        primary: localize("ui.components.selectors.serial.enter_manually"),
        secondary: undefined,
      });
      return items;
    }
  );

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

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .value=${this.value}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        .getItems=${this._getPickerItems}
        @value-changed=${this._handlePickerChange}
        @picker-opened=${this._handlePickerOpened}
        @picker-closed=${this._handlePickerClosed}
      ></ha-generic-picker>
    `;
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
    "ha-selector-serial": HaSerialSelector;
  }
}
