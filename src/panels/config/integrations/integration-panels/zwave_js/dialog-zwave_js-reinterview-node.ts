import "@material/mwc-button/mwc-button";
import { mdiCheckCircle, mdiCloseCircle } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import { reinterviewZwaveNode } from "../../../../../data/zwave_js";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ZWaveJSReinterviewNodeDialogParams } from "./show-dialog-zwave_js-reinterview-node";

@customElement("dialog-zwave_js-reinterview-node")
class DialogZWaveJSReinterviewNode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private device_id?: string;

  @state() private _status?: string;

  @state() private _stages?: string[];

  private _subscribed?: Promise<UnsubscribeFunc>;

  public async showDialog(
    params: ZWaveJSReinterviewNodeDialogParams
  ): Promise<void> {
    this._stages = undefined;
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
          this.hass.localize("ui.panel.config.zwave_js.reinterview_node.title")
        )}
      >
        ${!this._status
          ? html`
              <p>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.reinterview_node.introduction"
                )}
              </p>
              <p>
                <em>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.reinterview_node.battery_device_warning"
                  )}
                </em>
              </p>
              <mwc-button slot="primaryAction" @click=${this._startReinterview}>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.reinterview_node.start_reinterview"
                )}
              </mwc-button>
            `
          : ``}
        ${this._status === "started"
          ? html`
              <div class="flex-container">
                <ha-circular-progress active></ha-circular-progress>
                <div class="status">
                  <p>
                    <b>
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.reinterview_node.in_progress"
                      )}
                    </b>
                  </p>
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.reinterview_node.run_in_background"
                    )}
                  </p>
                </div>
              </div>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.common.close")}
              </mwc-button>
            `
          : ``}
        ${this._status === "failed"
          ? html`
              <div class="flex-container">
                <ha-svg-icon
                  .path=${mdiCloseCircle}
                  class="failed"
                ></ha-svg-icon>
                <div class="status">
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.reinterview_node.interview_failed"
                    )}
                  </p>
                </div>
              </div>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.common.close")}
              </mwc-button>
            `
          : ``}
        ${this._status === "finished"
          ? html`
              <div class="flex-container">
                <ha-svg-icon
                  .path=${mdiCheckCircle}
                  class="success"
                ></ha-svg-icon>
                <div class="status">
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.reinterview_node.interview_complete"
                    )}
                  </p>
                </div>
              </div>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.common.close")}
              </mwc-button>
            `
          : ``}
        ${this._stages
          ? html`
              <div class="stages">
                ${this._stages.map(
                  (stage) => html`
                    <span class="stage">
                      <ha-svg-icon
                        .path=${mdiCheckCircle}
                        class="success"
                      ></ha-svg-icon>
                      ${stage}
                    </span>
                  `
                )}
              </div>
            `
          : ""}
      </ha-dialog>
    `;
  }

  private _startReinterview(): void {
    if (!this.hass) {
      return;
    }
    this._subscribed = reinterviewZwaveNode(
      this.hass,
      this.device_id!,
      this._handleMessage.bind(this)
    );
  }

  private _handleMessage(message: any): void {
    if (message.event === "interview started") {
      this._status = "started";
    }
    if (message.event === "interview stage completed") {
      if (this._stages === undefined) {
        this._stages = [message.stage];
      } else {
        this._stages = [...this._stages, message.stage];
      }
    }
    if (message.event === "interview failed") {
      this._unsubscribe();
      this._status = "failed";
    }
    if (message.event === "interview completed") {
      this._unsubscribe();
      this._status = "finished";
    }
  }

  private _unsubscribe(): void {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
    }
  }

  public closeDialog(): void {
    this.device_id = undefined;
    this._status = undefined;
    this._stages = undefined;

    this._unsubscribe();

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
    "dialog-zwave_js-reinterview-node": DialogZWaveJSReinterviewNode;
  }
}
