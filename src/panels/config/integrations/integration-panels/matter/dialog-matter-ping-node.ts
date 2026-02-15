import { mdiAlertCircle, mdiCheckCircle, mdiCloseCircle } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { copyToClipboard } from "../../../../../common/util/copy-clipboard";
import "../../../../../components/ha-list";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-list-item";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-dialog";
import { pingMatterNode } from "../../../../../data/matter";
import { haStyle, haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { showToast } from "../../../../../util/toast";
import type { MatterPingNodeDialogParams } from "./show-dialog-matter-ping-node";

@customElement("dialog-matter-ping-node")
class DialogMatterPingNode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private device_id?: string;

  @state() private _status?: "started" | "failed";

  @state() private _pingResultEntries?: [
    ip_address: string,
    success: boolean,
  ][];

  @state() private _open = false;

  public async showDialog(params: MatterPingNodeDialogParams): Promise<void> {
    this.device_id = params.device_id;
    this._open = true;
  }

  private async _copyIpToClipboard(ev) {
    const ip = ev.currentTarget.ip;
    await copyToClipboard(ip);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  protected render() {
    if (!this.device_id) {
      return nothing;
    }

    return html`
      <ha-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.matter.ping_node.title"
        )}
        @closed=${this._dialogClosed}
      >
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
                      this._pingResultEntries
                        ? "ui.panel.config.matter.ping_node.no_ip_found"
                        : "ui.panel.config.matter.ping_node.ping_failed"
                    )}
                  </p>
                </div>
              </div>
            `
          : this._pingResultEntries
            ? html`
                <h2>
                  ${this.hass.localize(
                    "ui.panel.config.matter.ping_node.ping_complete"
                  )}
                </h2>
                <ha-list>
                  ${this._pingResultEntries.map(
                    ([ip, success]) =>
                      html`<ha-list-item
                        hasMeta
                        .ip=${ip}
                        @click=${this._copyIpToClipboard}
                        >${ip}
                        <ha-svg-icon
                          slot="meta"
                          .path=${success ? mdiCheckCircle : mdiAlertCircle}
                          class=${success ? "success" : "failed"}
                        ></ha-svg-icon>
                      </ha-list-item>`
                  )}
                </ha-list>
              `
            : this._status === "started"
              ? html`
                  <div class="flex-container">
                    <ha-spinner></ha-spinner>
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
                `}
        <ha-dialog-footer slot="footer">
          ${this._status === "failed" ||
          this._pingResultEntries ||
          this._status === "started"
            ? html`
                <ha-button slot="primaryAction" @click=${this.closeDialog}>
                  ${this.hass.localize("ui.common.close")}
                </ha-button>
              `
            : html`
                <ha-button slot="primaryAction" @click=${this._startPing}>
                  ${this.hass.localize(
                    "ui.panel.config.matter.ping_node.start_ping"
                  )}
                </ha-button>
              `}
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private async _startPing(): Promise<void> {
    if (!this.hass) {
      return;
    }
    this._status = "started";
    try {
      const pingResult = await pingMatterNode(this.hass, this.device_id!);
      const pingResultEntries = Object.entries(pingResult);
      if (pingResultEntries.length === 0) {
        this._status = "failed";
      }

      this._pingResultEntries = pingResultEntries;
    } catch (_err) {
      this._status = "failed";
    }
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this.device_id = undefined;
    this._status = undefined;
    this._pingResultEntries = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
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

        .stage {
          padding: 8px;
        }

        ha-list {
          --mdc-list-side-padding: 0;
        }

        .flex-container ha-spinner,
        .flex-container ha-svg-icon {
          margin-right: 20px;
        }
        .flex-container ha-svg-icon {
          width: 68px;
          height: 48px;
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
