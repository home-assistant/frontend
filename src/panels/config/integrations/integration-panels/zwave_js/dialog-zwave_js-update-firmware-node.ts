import "@material/mwc-linear-progress/mwc-linear-progress";
import { mdiCheckCircle, mdiCloseCircle, mdiFileUpload } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { computeDeviceNameDisplay } from "../../../../../common/entity/compute_device_name";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import "../../../../../components/ha-file-upload";
import "../../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../../components/ha-form/types";
import "../../../../../components/ha-svg-icon";
import type { DeviceRegistryEntry } from "../../../../../data/device_registry";
import type {
  ZWaveJSControllerFirmwareUpdateFinishedMessage,
  ZWaveJSFirmwareUpdateProgressMessage,
  ZWaveJSNodeFirmwareUpdateFinishedMessage,
  ZWaveJSNodeStatus,
  ZWaveJSNodeStatusUpdatedMessage,
} from "../../../../../data/zwave_js";
import {
  abortZwaveNodeFirmwareUpdate,
  ControllerFirmwareUpdateStatus,
  fetchZwaveIsNodeFirmwareUpdateInProgress,
  fetchZwaveNodeStatus,
  NodeFirmwareUpdateStatus,
  NodeStatus,
  subscribeZwaveNodeFirmwareUpdate,
  subscribeZwaveNodeStatus,
  uploadFirmwareAndBeginUpdate,
} from "../../../../../data/zwave_js";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import "../../../../../components/ha-button";
import type { ZWaveJSUpdateFirmwareNodeDialogParams } from "./show-dialog-zwave_js-update-firmware-node";

const firmwareTargetSchema: HaFormSchema[] = [
  {
    name: "firmware_target",
    type: "integer",
    valueMin: 0,
  },
];

@customElement("dialog-zwave_js-update-firmware-node")
class DialogZWaveJSUpdateFirmwareNode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private device?: DeviceRegistryEntry;

  @state() private _uploading = false;

  @state()
  private _updateFinishedMessage?:
    | ZWaveJSNodeFirmwareUpdateFinishedMessage
    | ZWaveJSControllerFirmwareUpdateFinishedMessage;

  @state()
  private _updateProgressMessage?: ZWaveJSFirmwareUpdateProgressMessage;

  @state() private _updateInProgress = false;

  @state() private _firmwareFile?: File;

  @state() private _nodeStatus?: ZWaveJSNodeStatus;

  @state() private _firmwareTarget?: number;

  private _subscribedNodeStatus?: Promise<UnsubscribeFunc>;

  private _subscribedNodeFirmwareUpdate?: Promise<UnsubscribeFunc>;

  private _deviceName?: string;

  private _cancelUpload?: () => void;

  public showDialog(params: ZWaveJSUpdateFirmwareNodeDialogParams): void {
    this._deviceName = computeDeviceNameDisplay(params.device, this.hass!);
    this.device = params.device;
    this._fetchData();
    this._subscribeNodeStatus();
  }

  public closeDialog(): void {
    this._unsubscribeNodeFirmwareUpdate();
    this._unsubscribeNodeStatus();
    this.device = undefined;
    this._updateProgressMessage = undefined;
    this._updateFinishedMessage = undefined;
    this._firmwareFile = undefined;
    this._nodeStatus = undefined;
    this._firmwareTarget = undefined;
    this._uploading = this._updateInProgress = false;

    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (
      !this.device ||
      !this._nodeStatus ||
      this._updateInProgress === undefined
    ) {
      return nothing;
    }

    const beginFirmwareUpdateHTML = html`<ha-file-upload
        .hass=${this.hass}
        .uploading=${this._uploading}
        .icon=${mdiFileUpload}
        .label=${this.hass.localize(
          "ui.panel.config.zwave_js.update_firmware.upload_firmware"
        )}
        .uploadingLabel=${this.hass.localize(
          "ui.panel.config.zwave_js.update_firmware.uploading",
          { name: this._firmwareFile?.name }
        )}
        .value=${this._firmwareFile}
        @file-picked=${this._uploadFile}
      ></ha-file-upload>
      ${this._nodeStatus.is_controller_node
        ? nothing
        : html`<p class=${this._uploading ? "disabled" : ""}>
              ${this.hass.localize(
                "ui.panel.config.zwave_js.update_firmware.firmware_target_intro"
              )}
            </p>
            <ha-form
              .hass=${this.hass}
              .data=${{ firmware_target: this._firmwareTarget }}
              .schema=${firmwareTargetSchema}
              @value-changed=${this._firmwareTargetChanged}
              .disabled=${this._uploading}
            ></ha-form>`}
      <ha-button
        slot="primaryAction"
        @click=${this._beginFirmwareUpdate}
        .disabled=${this._firmwareFile === undefined || this._uploading}
      >
        ${this.hass.localize(
          "ui.panel.config.zwave_js.update_firmware.begin_update"
        )}
      </ha-button>`;

    const status = this._updateFinishedMessage
      ? this._updateFinishedMessage.success
        ? "success"
        : "error"
      : undefined;

    const localizationKeySuffix = this._nodeStatus.is_controller_node
      ? "_controller"
      : "";

    const abortFirmwareUpdateButton = this._nodeStatus.is_controller_node
      ? nothing
      : html`
          <ha-button
            destructive
            slot="secondaryAction"
            @click=${this._abortFirmwareUpdate}
          >
            ${this.hass.localize(
              "ui.panel.config.zwave_js.update_firmware.abort"
            )}
          </ha-button>
        `;

    const closeButton = html`
      <ha-button slot="primaryAction" @click=${this.closeDialog}>
        ${this.hass.localize("ui.common.close")}
      </ha-button>
    `;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.zwave_js.update_firmware.title")
        )}
      >
        ${!this._updateProgressMessage && !this._updateFinishedMessage
          ? !this._updateInProgress
            ? html`
                <p class=${this._uploading ? "disabled" : ""}>
                  ${this.hass.localize(
                    `ui.panel.config.zwave_js.update_firmware.introduction${localizationKeySuffix}`,
                    {
                      device: html`<strong>${this._deviceName}</strong>`,
                    }
                  )}
                </p>
                ${beginFirmwareUpdateHTML}
                ${this._uploading &&
                this._nodeStatus.status === NodeStatus.Asleep
                  ? html`<p class="wakeup">
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.update_firmware.device_asleep"
                      )}
                    </p>`
                  : nothing}
                ${this._uploading ? abortFirmwareUpdateButton : nothing}
              `
            : html`
                <p>
                  ${this._nodeStatus.status === NodeStatus.Asleep
                    ? this.hass.localize(
                        "ui.panel.config.zwave_js.update_firmware.queued",
                        {
                          device: html`<strong>${this._deviceName}</strong>`,
                        }
                      )
                    : this.hass.localize(
                        "ui.panel.config.zwave_js.update_firmware.awake",
                        {
                          device: html`<strong>${this._deviceName}</strong>`,
                        }
                      )}
                </p>
                <p>
                  ${this._nodeStatus.status === NodeStatus.Asleep
                    ? this.hass.localize(
                        "ui.panel.config.zwave_js.update_firmware.close_queued",
                        {
                          device: html`<strong>${this._deviceName}</strong>`,
                        }
                      )
                    : this.hass.localize(
                        "ui.panel.config.zwave_js.update_firmware.close",
                        {
                          device: html`<strong>${this._deviceName}</strong>`,
                        }
                      )}
                </p>
                ${abortFirmwareUpdateButton} ${closeButton}
              `
          : this._updateProgressMessage && !this._updateFinishedMessage
            ? html`
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.update_firmware.in_progress",
                    {
                      device: html`<strong>${this._deviceName}</strong>`,
                      progress: (
                        (this._updateProgressMessage.sent_fragments * 100) /
                        this._updateProgressMessage.total_fragments
                      ).toFixed(2),
                    }
                  )}
                </p>
                <mwc-linear-progress
                  determinate
                  .progress=${this._updateProgressMessage.sent_fragments /
                  this._updateProgressMessage.total_fragments}
                ></mwc-linear-progress>
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.update_firmware.close",
                    {
                      device: html`<strong>${this._deviceName}</strong>`,
                    }
                  )}
                </p>
                ${abortFirmwareUpdateButton} ${closeButton}
              `
            : html`
                <div class="flex-container">
                  <ha-svg-icon
                    .path=${this._updateFinishedMessage!.success
                      ? mdiCheckCircle
                      : mdiCloseCircle}
                    .class=${status}
                  ></ha-svg-icon>
                  <div class="status">
                    <p>
                      ${this.hass.localize(
                        `ui.panel.config.zwave_js.update_firmware.finished_status.${status}`,
                        {
                          device: html`<strong>${this._deviceName}</strong>`,
                          message: this.hass.localize(
                            `ui.panel.config.zwave_js.update_firmware.finished_status.${
                              this._nodeStatus.is_controller_node
                                ? ControllerFirmwareUpdateStatus[
                                    this._updateFinishedMessage!.status
                                  ]
                                : NodeFirmwareUpdateStatus[
                                    this._updateFinishedMessage!.status
                                  ]
                            }`
                          ),
                        }
                      )}
                    </p>
                  </div>
                </div>
                ${this._updateFinishedMessage!.success
                  ? html`<p>
                      ${this.hass.localize(
                        `ui.panel.config.zwave_js.update_firmware.finished_status.done${localizationKeySuffix}`
                      )}
                    </p>`
                  : html`<p>
                        ${this.hass.localize(
                          "ui.panel.config.zwave_js.update_firmware.finished_status.try_again"
                        )}
                      </p>
                      ${beginFirmwareUpdateHTML}`}
              `}
      </ha-dialog>
    `;
  }

  private async _fetchData(): Promise<void> {
    [this._nodeStatus, this._updateInProgress] = await Promise.all([
      fetchZwaveNodeStatus(this.hass, this.device!.id),
      fetchZwaveIsNodeFirmwareUpdateInProgress(this.hass, this.device!.id),
    ]);
    if (this._updateInProgress) {
      this._subscribeNodeFirmwareUpdate();
    }
  }

  private async _beginFirmwareUpdate(): Promise<void> {
    this._uploading = true;
    this._updateProgressMessage = this._updateFinishedMessage = undefined;
    try {
      this._subscribeNodeFirmwareUpdate();
      await new Promise<void>((resolve, reject) => {
        const abortController = new AbortController();
        this._cancelUpload = () => {
          this._cancelUpload = undefined;
          abortController.abort();
          resolve();
        };
        uploadFirmwareAndBeginUpdate(
          this.hass,
          this.device!.id,
          this._firmwareFile!,
          this._firmwareTarget,
          abortController.signal
        )
          .then(() => this._cancelUpload?.())
          .catch(reject);
      });
      this._updateInProgress = true;
    } catch (err: any) {
      this._unsubscribeNodeFirmwareUpdate();
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.zwave_js.update_firmware.upload_failed"
        ),
        text: err.message,
        confirmText: this.hass!.localize("ui.common.close"),
      });
    } finally {
      this._uploading = false;
    }
  }

  private async _abortFirmwareUpdate(): Promise<void> {
    if (
      await showConfirmationDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.zwave_js.update_firmware.confirm_abort",
          {
            device: html`<strong>${this._deviceName}</strong>`,
          }
        ),
        dismissText: this.hass!.localize("ui.common.no"),
        confirmText: this.hass!.localize("ui.common.yes"),
      })
    ) {
      this._cancelUpload?.();
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
      this._updateFinishedMessage = undefined;
      this._updateProgressMessage = undefined;
      this._updateInProgress = false;
      this._uploading = false;
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
        this._nodeStatus!.status = message.status;
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
          | ZWaveJSFirmwareUpdateProgressMessage
          | ZWaveJSControllerFirmwareUpdateFinishedMessage
          | ZWaveJSNodeFirmwareUpdateFinishedMessage
      ) => {
        if (message.event === "firmware update progress") {
          if (!this._updateFinishedMessage) {
            this._updateProgressMessage = message;
          }
        } else {
          this._unsubscribeNodeFirmwareUpdate();
          this._updateProgressMessage = undefined;
          this._updateInProgress = false;
          this._updateFinishedMessage = message;
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

  private async _firmwareTargetChanged(ev) {
    this._firmwareTarget = ev.detail.value.firmware_target;
  }

  private async _uploadFile(ev) {
    this._firmwareFile = ev.detail.files[0];
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .success {
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

        p.disabled {
          color: var(--disabled-text-color);
        }

        p.wakeup {
          color: var(--warning-color);
          font-weight: var(--ha-font-weight-bold);
          margin-top: 24px;
          margin-bottom: 0;
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
