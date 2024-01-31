import "@material/mwc-button/mwc-button";
import { mdiCheckCircle, mdiCloseCircle } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import { pingMatterNode, MatterPingResult } from "../../../../../data/matter";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { MatterPingNodeDialogParams } from "./show-dialog-matter-ping-node";

@customElement("dialog-matter-ping-node")
class DialogMatterPingNode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private device_id?: string;

  @state() private _status?: string;

  @state() private _pingResult?: MatterPingResult;

  public async showDialog(params: MatterPingNodeDialogParams): Promise<void> {
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
          this.hass.localize("ui.panel.config.matter.ping_node.title")
        )}
      >
        ${this._pingResult
          ? html`
              <div class="flex-container">
                <ha-svg-icon
                  .path=${mdiCheckCircle}
                  class="success"
                ></ha-svg-icon>
                <div class="status">
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.matter.ping_node.ping_complete"
                    )}
                  </p>
                </div>
              </div>
              <div>
                <mwc-list>
                  ${Object.entries(this._pingResult).map(
                    ([ip, success]) =>
                      html`<ha-list-item hasMeta
                        >${ip}
                        <ha-icon
                          slot="meta"
                          icon=${success ? "mdi:check" : "mdi:close"}
                        ></ha-icon>
                      </ha-list-item>`
                  )}
                </mwc-list>
              </div>
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
                          "ui.panel.config.matter.ping_node.in_progress"
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
                          "ui.panel.config.matter.ping_node.ping_failed"
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
                      "ui.panel.config.matter.ping_node.introduction"
                    )}
                  </p>
                  <p>
                    <em>
                      ${this.hass.localize(
                        "ui.panel.config.matter.ping_node.battery_device_warning"
                      )}
                    </em>
                  </p>
                  <mwc-button slot="primaryAction" @click=${this._startPing}>
                    ${this.hass.localize(
                      "ui.panel.config.matter.ping_node.start_ping"
                    )}
                  </mwc-button>
                `}
      </ha-dialog>
    `;
  }

  private async _startPing(): Promise<void> {
    if (!this.hass) {
      return;
    }
    this._status = "started";
    try {
      this._pingResult = await pingMatterNode(this.hass, this.device_id!);
    } catch (err) {
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
    "dialog-matter-ping-node": DialogMatterPingNode;
  }
}
