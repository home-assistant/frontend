import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-select";
import type { HaSelectSelectEvent } from "../../../components/ha-select";
import "../../../components/ha-spinner";
import "../../../components/ha-wa-dialog";
import {
  extractApiErrorMessage,
  ignoreSupervisorError,
} from "../../../data/hassio/common";
import type {
  DatadiskList,
  HassioHassOSInfo,
  HassioHostInfo,
} from "../../../data/hassio/host";
import {
  fetchHassioHassOsInfo,
  listDatadisks,
  moveDatadisk,
} from "../../../data/hassio/host";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { bytesToString } from "../../../util/bytes-to-string";
import type { MoveDatadiskDialogParams } from "./show-dialog-move-datadisk";

const calculateMoveTime = memoizeOne((hostInfo: HassioHostInfo): number => {
  // Assume a speed of 30 MB/s.
  const moveTime = (hostInfo.disk_used * 1000) / 60 / 30;
  const rebootTime = (hostInfo.startup_time * 4) / 60;
  return Math.ceil((moveTime + rebootTime) / 10) * 10;
});

@customElement("dialog-move-datadisk")
class MoveDatadiskDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _hostInfo?: HassioHostInfo;

  @state() private _selectedDevice?: string;

  @state() private _disks?: DatadiskList["disks"];

  @state() private _osInfo?: HassioHassOSInfo;

  @state() private _moving = false;

  @state() private _open = false;

  public async showDialog(
    dialogParams: MoveDatadiskDialogParams
  ): Promise<Promise<void>> {
    this._hostInfo = dialogParams.hostInfo;
    this._open = true;

    try {
      this._osInfo = await fetchHassioHassOsInfo(this.hass);

      const data = await listDatadisks(this.hass);
      if (data.devices.length > 0) {
        this._disks = data.disks;
      } else {
        this.closeDialog();
        await showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.storage.datadisk.no_devices_title"
          ),
          text: this.hass.localize(
            "ui.panel.config.storage.datadisk.no_devices_text"
          ),
        });
      }
    } catch (err: any) {
      this.closeDialog();
      await showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.hardware.available_hardware.failed_to_get"
        ),
        text: extractApiErrorMessage(err),
      });
    }
  }

  public closeDialog(): void {
    this._open = false;
    if (!this._hostInfo || !this._osInfo || !this._disks) {
      this._dialogClosed();
    }
  }

  private _dialogClosed(): void {
    this._selectedDevice = undefined;
    this._disks = undefined;
    this._moving = false;
    this._hostInfo = undefined;
    this._osInfo = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._hostInfo || !this._osInfo || !this._disks) {
      return nothing;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this._moving
          ? this.hass.localize("ui.panel.config.storage.datadisk.moving")
          : this.hass.localize("ui.panel.config.storage.datadisk.title")}
        @closed=${this._dialogClosed}
      >
        ${this._moving
          ? html`
              <ha-spinner aria-label="Moving" size="large"></ha-spinner>
              <p class="progress-text">
                ${this.hass.localize(
                  "ui.panel.config.storage.datadisk.moving_desc"
                )}
              </p>
            `
          : html`
              ${this.hass.localize(
                "ui.panel.config.storage.datadisk.description",
                {
                  current_path: this._osInfo.data_disk,
                  time: calculateMoveTime(this._hostInfo),
                }
              )}
              <br /><br />

              <ha-select
                autofocus
                .label=${this.hass.localize(
                  "ui.panel.config.storage.datadisk.select_device"
                )}
                @selected=${this._selectDevice}
                .options=${this._disks.map((disk) => ({
                  value: disk.id,
                  label: `${disk.vendor} ${disk.model}`,
                  secondary: this.hass.localize(
                    "ui.panel.config.storage.datadisk.extra_information",
                    {
                      size: bytesToString(disk.size),
                      serial: disk.serial,
                    }
                  ),
                }))}
              ></ha-select>
            `}
        ${this._moving
          ? nothing
          : html`
              <ha-dialog-footer slot="footer">
                <ha-button
                  slot="secondaryAction"
                  appearance="plain"
                  @click=${this.closeDialog}
                >
                  ${this.hass.localize(
                    "ui.panel.config.storage.datadisk.cancel"
                  )}
                </ha-button>
                <ha-button
                  .disabled=${!this._selectedDevice}
                  slot="primaryAction"
                  @click=${this._moveDatadisk}
                >
                  ${this.hass.localize("ui.panel.config.storage.datadisk.move")}
                </ha-button>
              </ha-dialog-footer>
            `}
      </ha-wa-dialog>
    `;
  }

  private _selectDevice(ev: HaSelectSelectEvent): void {
    this._selectedDevice = ev.detail.value;
  }

  private async _moveDatadisk() {
    this._moving = true;
    try {
      await moveDatadisk(this.hass, this._selectedDevice!);
    } catch (err: any) {
      if (this.hass.connection.connected && !ignoreSupervisorError(err)) {
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.storage.datadisk.failed_to_move"
          ),
          text: extractApiErrorMessage(err),
        });
      }
    } finally {
      this.closeDialog();
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-select {
          width: 100%;
        }
        ha-spinner {
          display: block;
          margin: 32px auto;
        }

        .progress-text {
          text-align: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-move-datadisk": MoveDatadiskDialog;
  }
}
