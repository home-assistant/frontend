import "@material/mwc-button/mwc-button";
import { mdiCheckCircle, mdiCloseCircle } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ZWaveJSRemoveNodeDialogParams } from "./show-dialog-zwave_js-remove-node";

export interface ZWaveJSRemovedNode {
  node_id: number;
  manufacturer: string;
  label: string;
}

@customElement("dialog-zwave_js-remove-node")
class DialogZWaveJSRemoveNode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private entry_id?: string;

  @state() private _status = "";

  @state() private _node?: ZWaveJSRemovedNode;

  private _removeNodeTimeoutHandle?: number;

  private _subscribed?: Promise<() => Promise<void>>;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe();
  }

  public async showDialog(
    params: ZWaveJSRemoveNodeDialogParams
  ): Promise<void> {
    this.entry_id = params.entry_id;
  }

  protected render() {
    if (!this.entry_id) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.zwave_js.remove_node.title")
        )}
      >
        ${this._status === ""
          ? html`
              <p>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.remove_node.introduction"
                )}
              </p>
              <mwc-button slot="primaryAction" @click=${this._startExclusion}>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.remove_node.start_exclusion"
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
                    <b
                      >${this.hass.localize(
                        "ui.panel.config.zwave_js.remove_node.controller_in_exclusion_mode"
                      )}</b
                    >
                  </p>
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.remove_node.follow_device_instructions"
                    )}
                  </p>
                </div>
              </div>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.remove_node.cancel_exclusion"
                )}
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
                      "ui.panel.config.zwave_js.remove_node.exclusion_failed"
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
                      "ui.panel.config.zwave_js.remove_node.exclusion_finished",
                      "id",
                      this._node!.node_id
                    )}
                  </p>
                </div>
              </div>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
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
    this._subscribed = this.hass.connection.subscribeMessage(
      (message) => this._handleMessage(message),
      {
        type: "zwave_js/remove_node",
        entry_id: this.entry_id,
      }
    );
    this._removeNodeTimeoutHandle = window.setTimeout(
      () => this._unsubscribe(),
      120000
    );
  }

  private _handleMessage(message: any): void {
    if (message.event === "exclusion started") {
      this._status = "started";
    }
    if (message.event === "exclusion failed") {
      this._unsubscribe();
      this._status = "failed";
    }
    if (message.event === "exclusion stopped") {
      if (this._status !== "finished") {
        this._status = "";
      }
      this._unsubscribe();
    }
    if (message.event === "node removed") {
      this._status = "finished";
      this._node = message.node;
      this._unsubscribe();
    }
  }

  private _unsubscribe(): void {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
    }
    if (this._status === "started") {
      this.hass.callWS({
        type: "zwave_js/stop_exclusion",
        entry_id: this.entry_id,
      });
    }
    if (this._status !== "finished") {
      this._status = "";
    }
    if (this._removeNodeTimeoutHandle) {
      clearTimeout(this._removeNodeTimeoutHandle);
    }
  }

  public closeDialog(): void {
    this._unsubscribe();
    this.entry_id = undefined;
    this._status = "";

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
    "dialog-zwave_js-remove-node": DialogZWaveJSRemoveNode;
  }
}
