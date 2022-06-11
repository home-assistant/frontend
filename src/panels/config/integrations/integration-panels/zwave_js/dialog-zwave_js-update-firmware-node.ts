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
  subscribeZwaveNodeFirmwareUpdate,
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

  private _subscribedNodeStatus?: Promise<UnsubscribeFunc>;

  private _subscribedNodeFirmwareUpdate?: Promise<UnsubscribeFunc>;

  private _deviceName?: TemplateResult;

  public showDialog(params: ZWaveJSUpdateFirmwareNodeDialogParams): void {
    this._deviceName = html`<strong
      >${computeDeviceName(params.device, this.hass!)}</strong
    >`;
    this.device = params.device;
    this._getNodeStatus();
    this._getFirmwareUpdateInProgressStatus();
    this._subscribeNodeStatus();
  }

  public closeDialog(): void {
    this._unsubscribeNodeFirmwareUpdate();
    this._unsubscribeNodeStatus();
    this.device = undefined;
    this._uploading = false;
    this._updateFinished = undefined;
    this._updateProgress = undefined;
    this._updateInProgress = false;
    this._firmwareFile = undefined;
    this._nodeStatus = undefined;

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
        label=${this._firmwareFile?.name ??
        this.hass.localize(
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
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.update_firmware.introduction",
                    {
                      device: this._deviceName,
                    }
                  )}
                </p>
                ${beginFirmwareUpdateHTML}
              `
            : html`
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
              `
          : this._updateProgress && !this._updateFinished
          ? html`
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
              <ha-bar
                min="0"
                .max=${this._updateProgress.total_fragments}
                .value=${this._updateProgress.sent_fragments}
              >
              </ha-bar>
              <p>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.update_firmware.close",
                  {
                    device: this._deviceName,
                  }
                )}
              </p>
              ${abortFirmwareUpdateButton}
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
    if (this._updateInProgress) {
      this._subscribeNodeFirmwareUpdate();
    }
  }

  private async _beginFirmwareUpdate(): Promise<void> {
    this._uploading = true;
    this._updateProgress = this._updateFinished = undefined;
    try {
      this._subscribeNodeFirmwareUpdate();
      await uploadFirmware(this.hass, this.device!.id, this._firmwareFile!);
      this._updateInProgress = true;
      this._uploading = false;
    } catch (err: any) {
      this._unsubscribeNodeFirmwareUpdate();
      this._uploading = false;
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.zwave_js.update_firmware.upload_failed"
        ),
        text: err.message,
        confirmText: this.hass!.localize("ui.common.close"),
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
      this._unsubscribeNodeFirmwareUpdate();
      try {
        await abortZwaveNodeFirmwareUpdate(this.hass, this.device!.id);
      } catch (err: any) {
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.zwave_js.update_firmware.abort_failed"
          ),
          text: err.message,
          confirmText: this.hass!.localize("ui.common.close"),
        });
      }
      this._firmwareFile = undefined;
      this._updateFinished = undefined;
      this._updateProgress = undefined;
      this._updateInProgress = false;
    }
  }

  private _subscribeNodeStatus(): void {
    if (!this.hass || !this.device || this._subscribedNodeStatus) {
      return;
    }
    this._subscribedNodeStatus = subscribeZwaveNodeStatus(
      this.hass,
      this.device.id,
      (message: ZWaveJSNodeStatusUpdatedMessage) => {
        this._nodeStatus = message.status;
      }
    );
  }

  private _unsubscribeNodeStatus(): void {
    if (!this._subscribedNodeStatus) {
      return;
    }
    this._subscribedNodeStatus.then((unsub) => unsub());
    this._subscribedNodeStatus = undefined;
  }

  private _subscribeNodeFirmwareUpdate(): void {
    if (!this.hass || !this.device || this._subscribedNodeFirmwareUpdate) {
      return;
    }
    this._subscribedNodeFirmwareUpdate = subscribeZwaveNodeFirmwareUpdate(
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
          this._unsubscribeNodeFirmwareUpdate();
          this._updateProgress = undefined;
          this._updateInProgress = false;
          this._updateFinished = message;
        }
      }
    );
  }

  private _unsubscribeNodeFirmwareUpdate(): void {
    if (!this._subscribedNodeFirmwareUpdate) {
      return;
    }
    this._subscribedNodeFirmwareUpdate.then((unsub) => unsub());
    this._subscribedNodeFirmwareUpdate = undefined;
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
          margin-bottom: 5px;
        }

        ha-svg-icon {
          width: 68px;
          height: 48px;
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
