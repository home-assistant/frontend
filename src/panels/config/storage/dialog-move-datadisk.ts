import "@material/mwc-list/mwc-list-item";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import "../../../components/ha-circular-progress";
import "../../../components/ha-markdown";
import "../../../components/ha-select";
import {
  extractApiErrorMessage,
  ignoreSupervisorError,
} from "../../../data/hassio/common";
import {
  DatadiskList,
  fetchHassioHassOsInfo,
  HassioHassOSInfo,
  HassioHostInfo,
  listDatadisks,
  moveDatadisk,
} from "../../../data/hassio/host";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { MoveDatadiskDialogParams } from "./show-dialog-move-datadisk";

const calculateMoveTime = memoizeOne((hostInfo: HassioHostInfo): number => {
  const speed = hostInfo.disk_life_time !== "" ? 30 : 10;
  const moveTime = (hostInfo.disk_used * 1000) / 60 / speed;
  const rebootTime = (hostInfo.startup_time * 4) / 60;
  return Math.ceil((moveTime + rebootTime) / 10) * 10;
});

@customElement("dialog-move-datadisk")
class MoveDatadiskDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _hostInfo?: HassioHostInfo;

  @state() private _selectedDevice?: string;

  @state() private _devices?: DatadiskList["devices"];

  @state() private _osInfo?: HassioHassOSInfo;

  @state() private _moving = false;

  public async showDialog(
    dialogParams: MoveDatadiskDialogParams
  ): Promise<Promise<void>> {
    this._hostInfo = dialogParams.hostInfo;

    try {
      this._osInfo = await fetchHassioHassOsInfo(this.hass);
    } catch (err: any) {
      await showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.hardware.available_hardware.failed_to_get"
        ),
        text: extractApiErrorMessage(err),
      });
    }

    listDatadisks(this.hass).then((data) => {
      this._devices = data.devices;
    });
  }

  public closeDialog(): void {
    this._selectedDevice = undefined;
    this._devices = undefined;
    this._moving = false;
    this._hostInfo = undefined;
    this._osInfo = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._hostInfo || !this._osInfo) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        .heading=${this._moving
          ? this.hass.localize("ui.panel.config.storage.datadisk.moving")
          : this.hass.localize("ui.panel.config.storage.datadisk.title")}
        @closed=${this.closeDialog}
        ?hideActions=${this._moving}
      >
        ${this._moving
          ? html` <ha-circular-progress alt="Moving" size="large" active>
              </ha-circular-progress>
              <p class="progress-text">
                ${this.hass.localize(
                  "ui.panel.config.storage.datadisk.moving_desc"
                )}
              </p>`
          : html`${this._devices?.length
                ? html`
                    ${this.hass.localize(
                      "ui.panel.config.storage.datadisk.description",
                      {
                        current_path: this._osInfo.data_disk,
                        time: calculateMoveTime(this._hostInfo),
                      }
                    )}
                    <br /><br />

                    <ha-select
                      .label=${this.hass.localize(
                        "ui.panel.config.storage.datadisk.select_device"
                      )}
                      @selected=${this._select_device}
                      @closed=${stopPropagation}
                      dialogInitialFocus
                    >
                      ${this._devices.map(
                        (device) =>
                          html`<mwc-list-item .value=${device}
                            >${device}</mwc-list-item
                          >`
                      )}
                    </ha-select>
                  `
                : this._devices === undefined
                ? this.hass.localize(
                    "ui.panel.config.storage.datadisk.loading_devices"
                  )
                : this.hass.localize(
                    "ui.panel.config.storage.datadisk.no_devices"
                  )}

              <mwc-button
                slot="secondaryAction"
                @click=${this.closeDialog}
                dialogInitialFocus
              >
                ${this.hass.localize("ui.panel.config.storage.datadisk.cancel")}
              </mwc-button>

              <mwc-button
                .disabled=${!this._selectedDevice}
                slot="primaryAction"
                @click=${this._moveDatadisk}
              >
                ${this.hass.localize("ui.panel.config.storage.datadisk.move")}
              </mwc-button>`}
      </ha-dialog>
    `;
  }

  private _select_device(ev) {
    this._selectedDevice = ev.target.value;
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
        this.closeDialog();
      }
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
        ha-circular-progress {
          display: block;
          margin: 32px;
          text-align: center;
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
