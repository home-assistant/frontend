import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { copyToClipboard } from "../../../../../common/util/copy-clipboard";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-dialog-footer";
import type { HomeAssistant } from "../../../../../types";
import { showToast } from "../../../../../util/toast";
import type { SerialPortInfoDialogParams } from "./show-dialog-serial-port-info";

@customElement("dialog-serial-port-info")
class DialogSerialPortInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: SerialPortInfoDialogParams;

  @state() private _open = false;

  public showDialog(params: SerialPortInfoDialogParams): void {
    this._params = params;
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private async _copyToClipboard(): Promise<void> {
    await copyToClipboard(JSON.stringify(this._params!.port, null, 2));
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  private _fields(): [string, string][] {
    const port = this._params!.port;
    const localize = this.hass.localize;

    const fields: [string, string | null | undefined][] = [
      [localize("ui.panel.config.serial.fields.device"), port.device],
      [localize("ui.panel.config.serial.fields.description"), port.description],
      [
        localize("ui.panel.config.serial.fields.manufacturer"),
        port.manufacturer,
      ],
      [
        localize("ui.panel.config.serial.fields.interface_description"),
        port.interface_description,
      ],
      [
        localize("ui.panel.config.serial.fields.interface_number"),
        port.interface_num?.toString(),
      ],
      [
        localize("ui.panel.config.serial.fields.serial_number"),
        port.serial_number,
      ],
      [localize("ui.panel.config.serial.fields.vid"), port.vid],
      [localize("ui.panel.config.serial.fields.pid"), port.pid],
      [
        localize("ui.panel.config.serial.fields.bcd_device"),
        port.bcd_device == null
          ? undefined
          : port.bcd_device.toString(16).padStart(4, "0").toUpperCase(),
      ],
    ];

    return fields.filter(([, value]) => value) as [string, string][];
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.serial.port_information"
        )}
        @closed=${this._dialogClosed}
      >
        <table>
          <tbody>
            ${this._fields().map(
              ([label, value]) => html`
                <tr>
                  <th>${label}</th>
                  <td>${value}</td>
                </tr>
              `
            )}
          </tbody>
        </table>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this._copyToClipboard}
          >
            ${this.hass.localize("ui.common.copy")}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this.closeDialog}>
            ${this.hass.localize("ui.common.close")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  static readonly styles: CSSResultGroup = css`
    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      text-align: start;
      vertical-align: top;
      white-space: nowrap;
      padding-inline-end: var(--ha-space-4);
      color: var(--secondary-text-color);
      font-weight: var(--ha-font-weight-normal);
    }

    td {
      width: 100%;
      word-break: break-all;
    }

    tr:not(:first-child) th,
    tr:not(:first-child) td {
      padding-top: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-serial-port-info": DialogSerialPortInfo;
  }
}
