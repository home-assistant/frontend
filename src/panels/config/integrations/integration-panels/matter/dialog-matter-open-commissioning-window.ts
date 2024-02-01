import "@material/mwc-button/mwc-button";
import { mdiCheckCircle, mdiCloseCircle } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-circular-progress";
import "../../../../../components/ha-qr-code";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import {
  openMatterCommissioningWindow,
  MatterCommissioningParameters,
} from "../../../../../data/matter";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { MatterOpenCommissioningWindowDialogParams } from "./show-dialog-matter-open-commissioning-window";

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
              </p>
              <div class="flex-container">
                <ha-svg-icon
                  .path=${mdiCheckCircle}
                  class="success"
                ></ha-svg-icon>
                <div class="status">
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.matter.open_commissioning_window.sharing_code"
                    )}: <b>${this._commissionParams.setup_manual_code}</b>
                  </p>
                </div>
              </div>
              <ha-qr-code
                .data=${this._commissionParams.setup_qr_code}
                errorCorrectionLevel="quartile"
                scale="6"
              ></ha-qr-code>
              <div></div>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.common.close")}
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

  public closeDialog(): void {
    this.device_id = undefined;
    this._status = undefined;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-matter-open-commissioning-window": DialogMatterOpenCommissioningWindow;
  }
}
