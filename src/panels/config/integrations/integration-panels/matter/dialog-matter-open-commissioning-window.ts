import "@material/mwc-button/mwc-button";
import { mdiCloseCircle } from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import "../../../../../components/ha-qr-code";
import { domainToName } from "../../../../../data/integration";
import {
  MatterCommissioningParameters,
  openMatterCommissioningWindow,
} from "../../../../../data/matter";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { brandsUrl } from "../../../../../util/brands-url";
import { MatterOpenCommissioningWindowDialogParams } from "./show-dialog-matter-open-commissioning-window";
import { copyToClipboard } from "../../../../../common/util/copy-clipboard";

@customElement("dialog-matter-open-commissioning-window")
class DialogMatterOpenCommissioningWindow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private device_id?: string;

  @state() private _status?: string;

  @state() private _commissionParams?: MatterCommissioningParameters;

  public async showDialog(
    params: MatterOpenCommissioningWindowDialogParams
  ): Promise<void> {
    this.device_id = params.device_id;
  }

  protected render() {
    if (!this.device_id) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(
            "ui.panel.config.matter.open_commissioning_window.title"
          )
        )}
      >
        ${this._commissionParams
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
              <div class="sharing-code-container">
                <div class="sharing-code">
                  <img
                    crossorigin="anonymous"
                    referrerpolicy="no-referrer"
                    alt=${domainToName(this.hass.localize, "matter")}
                    src=${brandsUrl({
                      domain: "matter",
                      type: "logo",
                      darkOptimized: this.hass.themes?.darkMode,
                    })}
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
              <mwc-button slot="primaryAction" @click=${this._copyCode}>
                ${this.hass.localize(
                  "ui.panel.config.matter.open_commissioning_window.copy_code"
                )}
              </mwc-button>
            `
          : this._status === "started"
            ? html`
                <div class="flex-container">
                  <ha-circular-progress indeterminate></ha-circular-progress>
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
                <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                  ${this.hass.localize("ui.common.close")}
                </mwc-button>
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
                  <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                    ${this.hass.localize("ui.common.close")}
                  </mwc-button>
                `
              : html`
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.matter.open_commissioning_window.introduction"
                    )}
                  </p>
                  <mwc-button slot="primaryAction" @click=${this._start}>
                    ${this.hass.localize(
                      "ui.panel.config.matter.open_commissioning_window.start_commissioning"
                    )}
                  </mwc-button>
                `}
      </ha-dialog>
    `;
  }

  private async _start(): Promise<void> {
    if (!this.hass) {
      return;
    }
    this._status = "started";
    this._commissionParams = undefined;
    try {
      this._commissionParams = await openMatterCommissioningWindow(
        this.hass,
        this.device_id!
      );
    } catch (e) {
      this._status = "failed";
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
    this.device_id = undefined;
    this._status = undefined;
    this._commissionParams = undefined;
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

        .flex-container ha-circular-progress,
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
          border-radius: 16px;
          padding: 16px;
        }

        .sharing-code img {
          width: 160px;
          margin-bottom: 8px;
        }

        .code {
          font-family: monospace;
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
