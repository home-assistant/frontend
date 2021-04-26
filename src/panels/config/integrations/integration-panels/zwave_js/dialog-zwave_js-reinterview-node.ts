import "@material/mwc-button/mwc-button";
import { mdiCheckCircle, mdiCloseCircle } from "@mdi/js";
import {
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
  css,
} from "lit-element";
import "../../../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ZWaveJSReinterviewNodeDialogParams } from "./show-dialog-zwave_js-reinterview-node";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { UnsubscribeFunc } from "home-assistant-js-websocket";

@customElement("dialog-zwave_js-reinterview-node")
class DialogZWaveJSReinterviewNode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private entry_id?: string;

  @internalProperty() private node_id?: number;

  @internalProperty() private _status?: string;

  @internalProperty() private _stage?: string;

  private _subscribed?: Promise<UnsubscribeFunc>;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe();
  }

  public async showDialog(
    params: ZWaveJSReinterviewNodeDialogParams
  ): Promise<void> {
    this.entry_id = params.entry_id;
    this.node_id = params.node_id;
  }

  protected render(): TemplateResult {
    if (!this.entry_id) {
      return html``;
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
                  ${this._stage
                    ? html`
                        <p>
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.reinterview_node.interview_stage",
                            "stage",
                            this._stage
                          )}
                        </p>
                      `
                    : ""}
                </div>
              </div>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.panel.config.zwave_js.common.close")}
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
                ${this.hass.localize("ui.panel.config.zwave_js.common.close")}
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
                ${this.hass.localize("ui.panel.config.zwave_js.common.close")}
              </mwc-button>
            `
          : ``}
      </ha-dialog>
    `;
  }

  private _startReinterview(): void {
    if (!this.hass) {
      return;
    }
    this._subscribed = this.hass.connection.subscribeMessage(
      (message) => this._handleMessage(message),
      {
        type: "zwave_js/refresh_node_info",
        entry_id: this.entry_id,
        node_id: this.node_id,
      }
    );
  }

  private _handleMessage(message: any): void {
    if (message.event === "interview started") {
      this._status = "started";
    }
    if (message.event === "interview stage completed") {
      this._stage = message.stage;
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
    this._stage = undefined;
  }

  public closeDialog(): void {
    this.entry_id = undefined;
    this.node_id = undefined;
    this._status = "";

    this._unsubscribe();

    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        .success {
          color: var(--success-color);
        }

        .failed {
          color: var(--warning-color);
        }

        .flex-container {
          display: flex;
          align-items: center;
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
