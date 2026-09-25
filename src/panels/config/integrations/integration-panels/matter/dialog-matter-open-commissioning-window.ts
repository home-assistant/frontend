import { mdiCloseCircle } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { computeDeviceName } from "../../../../../common/entity/compute_device_name";
import { copyToClipboard } from "../../../../../common/util/copy-clipboard";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-qr-code";
import "../../../../../components/ha-spinner";
import { domainToName } from "../../../../../data/integration";
import type {
  MatterCommissioningParameters,
  MatterShareTarget,
} from "../../../../../data/matter";
import {
  canShareMatterDevice,
  matterShareRemainingSeconds,
  matterShareTargetExternal,
  openMatterCommissioningWindow,
  shareMatterDeviceExternal,
} from "../../../../../data/matter";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { brandsUrl } from "../../../../../util/brands-url";
import type { MatterOpenCommissioningWindowDialogParams } from "./show-dialog-matter-open-commissioning-window";

@customElement("dialog-matter-open-commissioning-window")
class DialogMatterOpenCommissioningWindow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private device_id?: string;

  @state() private _status?: string;

  @state() private _commissionParams?: MatterCommissioningParameters;

  @state() private _open = false;

  @state() private _sharing = false;

  @state() private _shareFailed = false;

  private _windowOpenedAt?: number;

  public async showDialog(
    params: MatterOpenCommissioningWindowDialogParams
  ): Promise<void> {
    this.device_id = params.device_id;
    this._open = true;
  }

  protected render() {
    if (!this.device_id) {
      return nothing;
    }
    const target = matterShareTargetExternal(this.hass);
    const shareTarget = canShareMatterDevice(target, this._commissionParams)
      ? target
      : undefined;

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.matter.open_commissioning_window.title"
        )}
        @closed=${this._dialogClosed}
      >
        ${
          this._commissionParams
            ? html`
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.matter.open_commissioning_window.success"
                  )}
                  <br />
                  ${this.hass.localize(
                    "ui.panel.config.matter.open_commissioning_window.scan_code"
                  )}
                </p>
                ${
                  this._shareFailed
                    ? html`<ha-alert alert-type="error">
                        ${this.hass.localize(
                          "ui.panel.config.matter.open_commissioning_window.share_failed"
                        )}
                      </ha-alert>`
                    : nothing
                }
                <div class="sharing-code-container">
                  <div class="sharing-code">
                    <img
                      crossorigin="anonymous"
                      referrerpolicy="no-referrer"
                      alt=${domainToName(this.hass.localize, "matter")}
                      src=${brandsUrl(
                        {
                          domain: "matter",
                          type: "logo",
                          darkOptimized: this.hass.themes?.darkMode,
                        },
                        this.hass.auth.data.hassUrl
                      )}
                    />
                    <ha-qr-code
                      .data=${this._commissionParams.setup_qr_code}
                      errorCorrectionLevel="quartile"
                      scale="6"
                      margin="1"
                    ></ha-qr-code>
                    <span class="code"
                      >${this._commissionParams.setup_manual_code.substring(
                        0,
                        4
                      )}-${this._commissionParams.setup_manual_code.substring(
                        4,
                        7
                      )}-${this._commissionParams.setup_manual_code.substring(
                        7
                      )}</span
                    >
                  </div>
                </div>
              `
            : this._status === "started"
              ? html`
                  <div class="flex-container">
                    <ha-spinner></ha-spinner>
                    <div class="status">
                      <p>
                        <b>
                          ${this.hass.localize(
                            "ui.panel.config.matter.open_commissioning_window.in_progress"
                          )}
                        </b>
                      </p>
                    </div>
                  </div>
                `
              : this._status === "failed"
                ? html`
                    <div class="flex-container">
                      <ha-svg-icon
                        .path=${mdiCloseCircle}
                        class="failed"
                      ></ha-svg-icon>
                      <div class="status">
                        <p>
                          ${this.hass.localize(
                            "ui.panel.config.matter.open_commissioning_window.failed"
                          )}
                        </p>
                      </div>
                    </div>
                  `
                : html`
                    <p>
                      ${this.hass.localize(
                        "ui.panel.config.matter.open_commissioning_window.description",
                        {
                          startCommissioning: html`<b
                            >${this.hass.localize(
                              "ui.panel.config.matter.open_commissioning_window.start_commissioning"
                            )}</b
                          >`,
                        }
                      )}
                    </p>
                    <p class="note">
                      ${this.hass.localize(
                        "ui.panel.config.matter.open_commissioning_window.prevent_misuse_description"
                      )}
                    </p>
                  `
        }
        <ha-dialog-footer slot="footer">
          ${
            this._commissionParams
              ? shareTarget
                ? html`
                    <ha-button
                      slot="secondaryAction"
                      appearance="plain"
                      @click=${this._copyCode}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.matter.open_commissioning_window.copy_code"
                      )}
                    </ha-button>
                    <ha-button
                      slot="primaryAction"
                      .loading=${this._sharing}
                      @click=${this._shareDevice}
                    >
                      ${this._shareLabel(shareTarget)}
                    </ha-button>
                  `
                : html`
                    <ha-button slot="primaryAction" @click=${this._copyCode}>
                      ${this.hass.localize(
                        "ui.panel.config.matter.open_commissioning_window.copy_code"
                      )}
                    </ha-button>
                  `
              : this._status === "started" || this._status === "failed"
                ? html`
                    <ha-button slot="primaryAction" @click=${this.closeDialog}>
                      ${this.hass.localize("ui.common.close")}
                    </ha-button>
                  `
                : html`
                    <ha-button slot="primaryAction" @click=${this._start}>
                      ${this.hass.localize(
                        "ui.panel.config.matter.open_commissioning_window.start_commissioning"
                      )}
                    </ha-button>
                  `
          }
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private async _start(): Promise<void> {
    if (!this.hass) {
      return;
    }
    this._status = "started";
    this._commissionParams = undefined;
    const deviceId = this.device_id!;
    try {
      // Taken before the request so the remaining time is never overstated.
      const requestedAt = Date.now();
      const params = await openMatterCommissioningWindow(this.hass, deviceId);
      // The dialog may have been closed, or reopened for another device, in the meantime.
      if (this.device_id !== deviceId) {
        return;
      }
      this._commissionParams = params;
      this._windowOpenedAt = requestedAt;
    } catch (_e) {
      if (this.device_id === deviceId) {
        this._status = "failed";
      }
    }
  }

  private _shareLabel(target: MatterShareTarget) {
    return target === "apple_home"
      ? this.hass.localize(
          "ui.panel.config.matter.open_commissioning_window.add_to_apple_home"
        )
      : this.hass.localize(
          "ui.panel.config.matter.open_commissioning_window.add_to_other_app"
        );
  }

  private async _shareDevice() {
    const params = this._commissionParams;
    if (!params || this._sharing) {
      return;
    }
    const remaining = matterShareRemainingSeconds(
      params.commissioning_timeout,
      this._windowOpenedAt,
      Date.now()
    );
    if (remaining !== undefined && remaining < 1) {
      this._shareFailed = true;
      return;
    }
    this._sharing = true;
    this._shareFailed = false;
    const device = this.hass.devices[this.device_id!];
    try {
      await shareMatterDeviceExternal(this.hass, {
        setup_qr_code: params.setup_qr_code,
        setup_pin_code: params.setup_pin_code,
        discriminator: params.discriminator ?? undefined,
        vendor_id: params.vendor_id ?? undefined,
        product_id: params.product_id ?? undefined,
        device_name: device ? computeDeviceName(device) : undefined,
        remaining_seconds: remaining,
      });
      // The dialog may have been closed, or reopened for another window, in the meantime.
      if (this._commissionParams === params) {
        this.closeDialog();
      }
    } catch (err: unknown) {
      if (this._commissionParams === params) {
        // Backing out of the platform sheet is not an error.
        this._shareFailed = (err as { code?: string })?.code !== "cancelled";
      }
    } finally {
      if (this._commissionParams === params) {
        this._sharing = false;
      }
    }
  }

  private async _copyCode() {
    if (!this._commissionParams) {
      return;
    }
    await copyToClipboard(this._commissionParams.setup_manual_code);
    this.closeDialog();
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this.device_id = undefined;
    this._status = undefined;
    this._commissionParams = undefined;
    this._sharing = false;
    this._shareFailed = false;
    this._windowOpenedAt = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .success {
          color: var(--success-color);
        }

        .failed {
          color: var(--error-color);
        }

        .flex-container {
          display: flex;
          align-items: center;
        }

        .stages {
          margin-top: 16px;
        }

        .stage ha-svg-icon {
          width: 16px;
          height: 16px;
        }
        .stage {
          padding: 8px;
        }

        ha-svg-icon {
          width: 68px;
          height: 48px;
        }

        ha-qr-code {
          text-align: center;
        }

        .flex-container ha-spinner,
        .flex-container ha-svg-icon {
          margin-right: 20px;
        }

        .sharing-code-container {
          display: flex;
          justify-content: center;
          padding-top: 16px;
        }

        .sharing-code {
          display: flex;
          flex-direction: column;
          align-items: center;
          border: 2px solid;
          border-radius: var(--ha-border-radius-xl);
          padding: 16px;
        }

        .sharing-code img {
          width: 160px;
          margin-bottom: 8px;
        }

        .code {
          font-family: var(--ha-font-family-code);
        }

        .note {
          color: var(--secondary-text-color);
          font-size: 0.9em;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-matter-open-commissioning-window": DialogMatterOpenCommissioningWindow;
  }
}
