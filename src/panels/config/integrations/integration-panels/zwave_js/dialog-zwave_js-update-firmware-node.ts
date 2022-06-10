import "../../../../../components/ha-bar";
import "../../../../../components/ha-circular-progress";
import "../../../../../components/ha-file-upload";
import "@material/mwc-button/mwc-button";
import { mdiCheckCircle, mdiCloseCircle, mdiFileUpload } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import {
  DeviceRegistryEntry,
  computeDeviceName,
} from "../../../../../data/device_registry";
import {
  abortZwaveNodeFirmwareUpdate,
  fetchZwaveNodeFirmwareUpdateProgress,
  fetchZwaveNodeStatus,
  FirmwareUpdateStatus,
  NodeStatus,
  subscribeZwaveNodeStatus,
  subscribeZwaveNodeUpdateFirmware,
  uploadFirmware,
  ZWaveJSNodeFirmwareUpdateFinishedMessage,
  ZWaveJSNodeFirmwareUpdateProgressMessage,
  ZWaveJSNodeStatusUpdatedMessage,
} from "../../../../../data/zwave_js";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ZWaveJSUpdateFirmwareNodeDialogParams } from "./show-dialog-zwave_js-update-firmware-node";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../../dialogs/generic/show-dialog-box";

@customElement("dialog-zwave_js-update-firmware-node")
class DialogZWaveJSUpdateFirmwareNode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private device?: DeviceRegistryEntry;

  @state() private _uploading = false;

  @state() private _updateFinished?: ZWaveJSNodeFirmwareUpdateFinishedMessage;

  @state() private _updateProgress?: ZWaveJSNodeFirmwareUpdateProgressMessage;

  @state() private _updateInProgress = false;

  @state() private _firmwareFile?: File;

  @state() private _nodeStatus?: NodeStatus;

  private _subscribed: Promise<UnsubscribeFunc>[] = [];

  private _deviceName?: TemplateResult;

  public showDialog(params: ZWaveJSUpdateFirmwareNodeDialogParams): void {
    this._deviceName = html`<em
      >${computeDeviceName(params.device, this.hass!)}</em
    >`;
    this.device = params.device;
    this._subscribe();
    this._getNodeStatus();
    this._getFirmwareUpdateInProgressStatus();
  }

  public closeDialog(): void {
    this.device = undefined;
    this._updateProgress = undefined;
    this._updateFinished = undefined;

    this._unsubscribe();

    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this.device) {
      return html``;
    }

    const beginFirmwareUpdateHTML = html`<ha-file-upload
        .hass=${this.hass}
        .uploading=${this._uploading}
        .icon=${mdiFileUpload}
        label=${this.hass.localize(
          "ui.panel.config.zwave_js.update_firmware.upload_firmware"
        )}
        @file-picked=${this._uploadFile}
      ></ha-file-upload>
      <mwc-button
        slot="primaryAction"
        @click=${this._beginFirmwareUpdate}
        .disabled=${this._firmwareFile === undefined}
      >
        ${this.hass.localize(
          "ui.panel.config.zwave_js.update_firmware.begin_update"
        )}
      </mwc-button>`;

    const abortFirmwareUpdateButton = html`
      <mwc-button slot="primaryAction" @click=${this._abortFirmwareUpdate}>
        ${this.hass.localize("ui.panel.config.zwave_js.update_firmware.abort")}
      </mwc-button>
    `;

    const status = this._updateFinished
      ? FirmwareUpdateStatus[this._updateFinished.status]
          .split("_")[0]
          .toLowerCase()
      : undefined;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.zwave_js.update_firmware.title")
        )}
      >
        ${!this._updateProgress && !this._updateFinished
          ? !this._updateInProgress
            ? html`
                <div class="flex-container">
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.update_firmware.introduction",
                      {
                        device: this._deviceName,
                      }
                    )}
                  </p>
                </div>
                ${beginFirmwareUpdateHTML}
              `
            : html`
                <div class="flex-container">
                  <p>
                    ${this._nodeStatus === NodeStatus.Asleep
                      ? this.hass.localize(
                          "ui.panel.config.zwave_js.update_firmware.queued",
                          {
                            device: this._deviceName,
                          }
                        )
                      : this.hass.localize(
                          "ui.panel.config.zwave_js.update_firmware.awake",
                          {
                            device: this._deviceName,
                          }
                        )}
                  </p>
                  <br />
                  <p>
                    ${this._nodeStatus === NodeStatus.Asleep
                      ? this.hass.localize(
                          "ui.panel.config.zwave_js.update_firmware.close_queued",
                          {
                            device: this._deviceName,
                          }
                        )
                      : this.hass.localize(
                          "ui.panel.config.zwave_js.update_firmware.close",
                          {
                            device: this._deviceName,
                          }
                        )}
                  </p>
                  ${abortFirmwareUpdateButton}
                </div>
              `
          : this._updateProgress && !this._updateFinished
          ? html`
              <div class="flex-container">
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.update_firmware.in_progress",
                    {
                      device: this._deviceName,
                      sent: this._updateProgress.sent_fragments,
                      total: this._updateProgress.total_fragments,
                    }
                  )}
                </p>
                <br />
                <ha-bar
                  min="0"
                  .max=${this._updateProgress.total_fragments}
                  .value=${this._updateProgress.sent_fragments}
                >
                </ha-bar>
                <br />
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.update_firmware.close",
                    {
                      device: this._deviceName,
                    }
                  )}
                </p>
                ${abortFirmwareUpdateButton}
              </div>
            `
          : html`
              <div class="flex-container">
                <ha-svg-icon
                  .path=${status === "ok" ? mdiCheckCircle : mdiCloseCircle}
                  .class=${status}
                ></ha-svg-icon>
                <div class="status">
                  <p>
                    ${this.hass.localize(
                      `ui.panel.config.zwave_js.update_firmware.finished_status.${status}`,
                      {
                        device: this._deviceName,
                        message: this.hass.localize(
                          `ui.panel.config.zwave_js.update_firmware.finished_status.${
                            FirmwareUpdateStatus[this._updateFinished!.status]
                          }`
                        ),
                      }
                    )}
                  </p>
                </div>
              </div>
              ${beginFirmwareUpdateHTML}
            `}
      </ha-dialog>
    `;
  }

  private async _getNodeStatus(): Promise<void> {
    this._nodeStatus = (
      await fetchZwaveNodeStatus(this.hass, this.device!.id)
    ).status;
  }

  private async _getFirmwareUpdateInProgressStatus(): Promise<void> {
    this._updateInProgress = await fetchZwaveNodeFirmwareUpdateProgress(
      this.hass,
      this.device!.id
    );
  }

  private async _beginFirmwareUpdate(): Promise<void> {
    this._uploading = true;
    this._updateProgress = this._updateFinished = undefined;
    try {
      await uploadFirmware(this.hass, this.device!.id, this._firmwareFile!);
      this._updateInProgress = true;
      this._uploading = false;
    } catch (err: any) {
      this._uploading = false;
      showAlertDialog(this, {
        title: "Upload failed",
        text: err.message,
        confirmText: "ok",
      });
    }
  }

  private async _abortFirmwareUpdate(): Promise<void> {
    if (
      await showConfirmationDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.zwave_js.update_firmware.confirm_abort",
          {
            device: this._deviceName,
          }
        ),
        dismissText: this.hass!.localize("ui.common.no"),
        confirmText: this.hass!.localize("ui.common.yes"),
      })
    ) {
      this._updateInProgress = false;
      abortZwaveNodeFirmwareUpdate(this.hass, this.device!.id);
    }
  }

  private _subscribe(): void {
    if (!this.hass || !this.device) {
      return;
    }
    this._subscribed.push(
      subscribeZwaveNodeUpdateFirmware(
        this.hass,
        this.device.id,
        (
          message:
            | ZWaveJSNodeFirmwareUpdateFinishedMessage
            | ZWaveJSNodeFirmwareUpdateProgressMessage
        ) => {
          if (message.event === "firmware update progress") {
            if (!this._updateFinished) {
              this._updateProgress = message;
            }
          } else {
            this._updateProgress = undefined;
            this._updateInProgress = false;
            this._updateFinished = message;
          }
        }
      ),
      subscribeZwaveNodeStatus(
        this.hass,
        this.device.id,
        (message: ZWaveJSNodeStatusUpdatedMessage) => {
          this._nodeStatus = message.status;
        }
      )
    );
  }

  private _unsubscribe(): void {
    this._subscribed.forEach((sub) => sub.then((unsub) => unsub()));
    this._subscribed = [];
  }

  private async _uploadFile(ev) {
    this._firmwareFile = ev.detail.files[0];
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .ok {
          color: var(--success-color);
        }

        .error {
          color: var(--error-color);
        }

        .flex-container {
          display: flex;
          align-items: center;
        }

        ha-svg-icon {
          width: 68px;
          height: 48px;
        }

        .flex-container ha-svg-icon {
          margin-right: 20px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zwave_js-update-firmware-node": DialogZWaveJSUpdateFirmwareNode;
  }
}
