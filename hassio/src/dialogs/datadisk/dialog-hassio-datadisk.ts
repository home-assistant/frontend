import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import { stringCompare } from "../../../../src/common/string/compare";
import { createCloseHeading } from "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-markdown";
import {
  extractApiErrorMessage,
  ignoreSupervisorError,
} from "../../../../src/data/hassio/common";
import { HassioHardwareInfo } from "../../../../src/data/hassio/hardware";
import { moveDatadisk } from "../../../../src/data/hassio/host";
import { showAlertDialog } from "../../../../src/dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import { hassioStyle } from "../../resources/hassio-style";
import { HassioDatatiskDialogParams } from "./show-dialog-hassio-datadisk";

const _filterDevices = memoizeOne(
  (hardware: HassioHardwareInfo, current_path: string) =>
    hardware.devices
      .filter(
        (device) =>
          device.attributes?.DEVTYPE === "disk" &&
          device.attributes?.MINOR === "0" &&
          !device.dev_path.startsWith(current_path)
      )
      .sort((a, b) => stringCompare(a.name, b.name))
);

@customElement("dialog-hassio-datadisk")
class HassioDatadiskDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: HassioDatatiskDialogParams;

  @state() private _selected_device?: string;

  public showDialog(params: HassioDatatiskDialogParams) {
    this._params = params;
  }

  public closeDialog(): void {
    this._params = undefined;
    this._selected_device = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    const devices = _filterDevices(
      this._params.hardware,
      this._params.supervisor.os.data_disk
    );
    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this._params.supervisor.localize("dialog.datadisk_move.title")
        )}
      >
        ${devices.length
          ? html`
              ${this._params.supervisor.localize(
                "dialog.datadisk_move.description",
                {
                  current_path: this._params.supervisor.os.data_disk,
                }
              )}
              <br /><br />

              <paper-dropdown-menu
                .label=${this._params.supervisor.localize(
                  "dialog.datadisk_move.select_device"
                )}
                @value-changed=${this._select_device}
              >
                <paper-listbox slot="dropdown-content">
                  ${devices.map(
                    (device) =>
                      html`<paper-item>${device.dev_path}</paper-item>`
                  )}
                </paper-listbox>
              </paper-dropdown-menu>
            `
          : this._params.supervisor.localize("dialog.datadisk_move.no_devices")}

        <mwc-button slot="secondaryAction" @click=${this.closeDialog}>
          ${this._params?.supervisor.localize("dialog.datadisk_move.cancel")}
        </mwc-button>

        <mwc-button
          .disabled=${!this._selected_device}
          slot="primaryAction"
          @click=${this._moveDatadisk}
        >
          ${this._params?.supervisor.localize("dialog.datadisk_move.move")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _select_device(event) {
    this._selected_device = event.detail.value;
  }

  private async _moveDatadisk() {
    try {
      await moveDatadisk(this.hass, this._selected_device!);
    } catch (err) {
      if (this.hass.connection.connected && !ignoreSupervisorError(err)) {
        showAlertDialog(this, {
          title: this._params!.supervisor.localize(
            "system.host.failed_to_move"
          ),
          text: extractApiErrorMessage(err),
        });
      }
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      hassioStyle,
      css`
        paper-dropdown-menu {
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-datadisk": HassioDatadiskDialog;
  }
}
