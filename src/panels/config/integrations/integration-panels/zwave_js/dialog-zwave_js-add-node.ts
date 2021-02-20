import "@material/mwc-button/mwc-button";
import { mdiCheckCircle, mdiCloseCircle } from "@mdi/js";
import "../../../../../components/ha-switch";
import "../../../../../components/ha-formfield";
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
import { ZWaveJSAddNodeDialogParams } from "./show-dialog-zwave_js-add-node";
import { fireEvent } from "../../../../../common/dom/fire_event";

export interface ZWaveJSAddNodeDevice {
  id: string;
  name: string;
}

@customElement("dialog-zwave_js-add-node")
class DialogZWaveJSAddNode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private entry_id?: string;

  @internalProperty() private _use_secure_inclusion = false;

  @internalProperty() private _status = "";

  @internalProperty() private _device?: ZWaveJSAddNodeDevice;

  private _addNodeTimeoutHandle?: number;

  private _subscribed?: Promise<() => Promise<void>>;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe();
  }

  public async showDialog(params: ZWaveJSAddNodeDialogParams): Promise<void> {
    this.entry_id = params.entry_id;
  }

  protected render(): TemplateResult {
    if (!this.entry_id) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        @closed="${this.closeDialog}"
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.zwave_js.add_node.title")
        )}
      >
        ${this._status === ""
          ? html`
              <p>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.add_node.introduction"
                )}
              </p>
              <div class="secure_inclusion_field">
                <ha-formfield
                  .label=${this.hass.localize(
                    "ui.panel.config.zwave_js.add_node.use_secure_inclusion"
                  )}
                >
                  <ha-switch
                    @change=${this._secureInclusionToggleChanged}
                    .checked=${this._use_secure_inclusion}
                  ></ha-switch>
                </ha-formfield>
                <p>
                  <em>
                    <small>
                      ${this.hass!.localize(
                        "ui.panel.config.zwave_js.add_node.secure_inclusion_warning"
                      )}
                    </small>
                  </em>
                </p>
              </div>
              <mwc-button slot="primaryAction" @click=${this._startInclusion}>
                ${this._use_secure_inclusion
                  ? html`${this.hass.localize(
                      "ui.panel.config.zwave_js.add_node.start_secure_inclusion"
                    )}`
                  : html` ${this.hass.localize(
                      "ui.panel.config.zwave_js.add_node.start_inclusion"
                    )}`}
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
                        "ui.panel.config.zwave_js.add_node.controller_in_inclusion_mode"
                      )}</b
                    >
                  </p>
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.add_node.follow_device_instructions"
                    )}
                  </p>
                </div>
              </div>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.add_node.cancel_inclusion"
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
                      "ui.panel.config.zwave_js.add_node.inclusion_failed"
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
                      "ui.panel.config.zwave_js.add_node.inclusion_finished"
                    )}
                  </p>
                  <a href="${`/config/devices/device/${this._device!.id}`}">
                    <mwc-button>
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.add_node.view_device"
                      )}
                    </mwc-button>
                  </a>
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

  private async _secureInclusionToggleChanged(ev): Promise<void> {
    const target = ev.target;
    this._use_secure_inclusion = target.checked;
  }

  private _startInclusion(): void {
    if (!this.hass) {
      return;
    }
    this._subscribed = this.hass.connection.subscribeMessage(
      (message) => this._handleMessage(message),
      {
        type: "zwave_js/add_node",
        entry_id: this.entry_id,
        secure: this._use_secure_inclusion,
      }
    );
    this._addNodeTimeoutHandle = window.setTimeout(
      () => this._unsubscribe(),
      90000
    );
  }

  private _handleMessage(message: any): void {
    if (message.event === "inclusion started") {
      this._status = "started";
    }
    if (message.event === "inclusion failed") {
      this._unsubscribe();
      this._status = "failed";
    }
    if (message.event === "inclusion stopped") {
      if (this._status !== "finished") {
        this._status = "";
      }
      this._unsubscribe();
    }
    if (message.event === "device registered") {
      this._device = message.device;
      this._status = "finished";
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
        type: "zwave_js/stop_inclusion",
        entry_id: this.entry_id,
      });
    }
    if (this._status !== "finished") {
      this._status = "";
    }
    if (this._addNodeTimeoutHandle) {
      clearTimeout(this._addNodeTimeoutHandle);
    }
  }

  public closeDialog(): void {
    this._unsubscribe();
    this.entry_id = undefined;
    this._status = "";
    this._device = undefined;
    this._use_secure_inclusion = false;

    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        .secure_inclusion_field {
          margin-top: 48px;
        }

        .success {
          color: green;
        }

        .failed {
          color: red;
        }

        blockquote {
          display: block;
          background-color: #ddd;
          padding: 8px;
          margin: 8px 0;
          font-size: 0.9em;
        }

        blockquote em {
          font-size: 0.9em;
          margin-top: 6px;
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
    "dialog-zwave_js-add-node": DialogZWaveJSAddNode;
  }
}
