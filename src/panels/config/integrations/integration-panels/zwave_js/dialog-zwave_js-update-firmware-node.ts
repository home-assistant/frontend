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
  FirmwareUpdateStatus,
  subscribeZwaveNodeUpdateFirmware,
  uploadFirmware,
  ZWaveJSNodeFirmwareUpdateFinishedMessage,
  ZWaveJSNodeFirmwareUpdateProgressMessage,
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

  private _subscribed?: Promise<UnsubscribeFunc>;

  private _deviceName?: TemplateResult;

  public showDialog(params: ZWaveJSUpdateFirmwareNodeDialogParams): void {
    this._deviceName = html`<em
      >${computeDeviceName(params.device, this.hass!)}</em
    >`;
    this.device = params.device;
    this._subscribe();
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
        ${this.hass.localize("ui.panel.config.zwave_js.update_firmware.begin")}
      </mwc-button>`;

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
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.update_firmware.queued",
                      {
                        device: this._deviceName,
                      }
                    )}
                  </p>
                  <mwc-button
                    slot="primaryAction"
                    @click=${this._abortFirmwareUpdate}
                  >
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.update_firmware.abort"
                    )}
                  </mwc-button>
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
                    }
                  )}
                </p>
              </div>
              <div class="progress-text">
                ${`${this._updateProgress.sent_fragments} / ${this._updateProgress.total_fragments}`}
              </div>
              <ha-bar
                min="0"
                .max=${this._updateProgress.total_fragments}
                .value=${this._updateProgress.sent_fragments}
              >
              </ha-bar>
              <mwc-button
                slot="primaryAction"
                @click=${this._abortFirmwareUpdate}
              >
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.update_firmware.abort"
                )}
              </mwc-button>
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

  private async _getFirmwareUpdateInProgressStatus(): Promise<void> {
    this._updateInProgress = await fetchZwaveNodeFirmwareUpdateProgress(
      this.hass,
      this.device!.id
    );
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

  private async _beginFirmwareUpdate(): Promise<void> {
    this._uploading = true;
    this._updateProgress = this._updateFinished = undefined;
    try {
      await uploadFirmware(this.hass, this.device!.id, this._firmwareFile!);
      this._updateInProgress = true;
    } catch (err: any) {
      showAlertDialog(this, {
        title: "Upload failed",
        text: err.message,
        confirmText: "ok",
      });
    } finally {
      this._uploading = false;
    }
  }

  private _subscribe(): void {
    if (!this.hass || !this.device) {
      return;
    }
    this._subscribed = subscribeZwaveNodeUpdateFirmware(
      this.hass,
      this.device.id,
      this._handleMessage.bind(this)
    );
  }

  private _handleMessage(
    message:
      | ZWaveJSNodeFirmwareUpdateFinishedMessage
      | ZWaveJSNodeFirmwareUpdateProgressMessage
  ): void {
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

  private _unsubscribe(): void {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
    }
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

        .progress-text {
          text-align: right;
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
