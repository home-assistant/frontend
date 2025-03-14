import "@material/mwc-button/mwc-button";
import { mdiCheckCircle, mdiCloseCircle } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-spinner";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import { interviewMatterNode } from "../../../../../data/matter";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { MatterReinterviewNodeDialogParams } from "./show-dialog-matter-reinterview-node";

@customElement("dialog-matter-reinterview-node")
class DialogMatterReinterviewNode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private device_id?: string;

  @state() private _status?: string;

  public async showDialog(
    params: MatterReinterviewNodeDialogParams
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
          this.hass.localize("ui.panel.config.matter.reinterview_node.title")
        )}
      >
        ${!this._status
          ? html`
              <p>
                ${this.hass.localize(
                  "ui.panel.config.matter.reinterview_node.introduction"
                )}
              </p>
              <p>
                <em>
                  ${this.hass.localize(
                    "ui.panel.config.matter.reinterview_node.battery_device_warning"
                  )}
                </em>
              </p>
              <mwc-button slot="primaryAction" @click=${this._startReinterview}>
                ${this.hass.localize(
                  "ui.panel.config.matter.reinterview_node.start_reinterview"
                )}
              </mwc-button>
            `
          : this._status === "started"
            ? html`
                <div class="flex-container">
                  <ha-spinner></ha-spinner>
                  <div class="status">
                    <p>
                      <b>
                        ${this.hass.localize(
                          "ui.panel.config.matter.reinterview_node.in_progress"
                        )}
                      </b>
                    </p>
                    <p>
                      ${this.hass.localize(
                        "ui.panel.config.matter.reinterview_node.run_in_background"
                      )}
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
                          "ui.panel.config.matter.reinterview_node.interview_failed"
                        )}
                      </p>
                    </div>
                  </div>
                  <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                    ${this.hass.localize("ui.common.close")}
                  </mwc-button>
                `
              : this._status === "finished"
                ? html`
                    <div class="flex-container">
                      <ha-svg-icon
                        .path=${mdiCheckCircle}
                        class="success"
                      ></ha-svg-icon>
                      <div class="status">
                        <p>
                          ${this.hass.localize(
                            "ui.panel.config.matter.reinterview_node.interview_complete"
                          )}
                        </p>
                      </div>
                    </div>
                    <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                      ${this.hass.localize("ui.common.close")}
                    </mwc-button>
                  `
                : nothing}
      </ha-dialog>
    `;
  }

  private async _startReinterview(): Promise<void> {
    if (!this.hass) {
      return;
    }
    this._status = "started";
    try {
      await interviewMatterNode(this.hass, this.device_id!);
      this._status = "finished";
    } catch (_err) {
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

        .flex-container ha-spinner,
        .flex-container ha-svg-icon {
          margin-right: 20px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-matter-reinterview-node": DialogMatterReinterviewNode;
  }
}
