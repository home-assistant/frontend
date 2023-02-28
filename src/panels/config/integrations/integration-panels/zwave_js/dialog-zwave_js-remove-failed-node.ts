import "@material/mwc-button/mwc-button";
import { mdiCheckCircle, mdiCloseCircle, mdiRobotDead } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import {
  removeFailedZwaveNode,
  ZWaveJSRemovedNode,
} from "../../../../../data/zwave_js";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ZWaveJSRemoveFailedNodeDialogParams } from "./show-dialog-zwave_js-remove-failed-node";

@customElement("dialog-zwave_js-remove-failed-node")
class DialogZWaveJSRemoveFailedNode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private device_id?: string;

  @state() private _status = "";

  @state() private _error?: any;

  @state() private _node?: ZWaveJSRemovedNode;

  private _subscribed?: Promise<UnsubscribeFunc | void>;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe();
  }

  public async showDialog(
    params: ZWaveJSRemoveFailedNodeDialogParams
  ): Promise<void> {
    this.device_id = params.device_id;
  }

  public closeDialog(): void {
    this._unsubscribe();
    this.device_id = undefined;
    this._status = "";

    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public closeDialogFinished(): void {
    history.back();
    this.closeDialog();
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
            "ui.panel.config.zwave_js.remove_failed_node.title"
          )
        )}
      >
        ${this._status === ""
          ? html`
              <div class="flex-container">
                <ha-svg-icon
                  .path=${mdiRobotDead}
                  class="introduction"
                ></ha-svg-icon>
                <div class="status">
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.remove_failed_node.introduction"
                  )}
                </div>
              </div>
              <mwc-button slot="primaryAction" @click=${this._startExclusion}>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.remove_failed_node.remove_device"
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
                        "ui.panel.config.zwave_js.remove_failed_node.in_progress"
                      )}
                    </b>
                  </p>
                </div>
              </div>
            `
          : ``}
        ${this._status === "failed"
          ? html`
              <div class="flex-container">
                <ha-svg-icon
                  .path=${mdiCloseCircle}
                  class="error"
                ></ha-svg-icon>
                <div class="status">
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.remove_failed_node.removal_failed"
                    )}
                  </p>
                  ${this._error
                    ? html` <p><em> ${this._error.message} </em></p> `
                    : ``}
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
                      "ui.panel.config.zwave_js.remove_failed_node.removal_finished",
                      "id",
                      this._node!.node_id
                    )}
                  </p>
                </div>
              </div>
              <mwc-button
                slot="primaryAction"
                @click=${this.closeDialogFinished}
              >
                ${this.hass.localize("ui.common.close")}
              </mwc-button>
            `
          : ``}
      </ha-dialog>
    `;
  }

  private _startExclusion(): void {
    if (!this.hass) {
      return;
    }
    this._status = "started";
    this._subscribed = removeFailedZwaveNode(
      this.hass,
      this.device_id!,
      (message: any) => this._handleMessage(message)
    ).catch((error) => {
      this._status = "failed";
      this._error = error;
    });
  }

  private _handleMessage(message: any): void {
    if (message.event === "exclusion started") {
      this._status = "started";
    }
    if (message.event === "node removed") {
      this._status = "finished";
      this._node = message.node;
      this._unsubscribe();
    }
  }

  private async _unsubscribe(): Promise<void> {
    if (this._subscribed) {
      const unsubFunc = await this._subscribed;
      if (unsubFunc instanceof Function) {
        unsubFunc();
      }
      this._subscribed = undefined;
    }
    if (this._status !== "finished") {
      this._status = "";
    }
  }

  static get styles(): CSSResultGroup {
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
    "dialog-zwave_js-remove-failed-node": DialogZWaveJSRemoveFailedNode;
  }
}
