import "@material/mwc-button/mwc-button";
import { mdiCheckCircle, mdiCloseCircle, mdiRobotDead } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-spinner";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import type {
  ZWaveJSNodeStatus,
  ZWaveJSRemovedNode,
} from "../../../../../data/zwave_js";
import {
  fetchZwaveNodeStatus,
  NodeStatus,
  removeFailedZwaveNode,
} from "../../../../../data/zwave_js";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { ZWaveJSRemoveFailedNodeDialogParams } from "./show-dialog-zwave_js-remove-failed-node";
import { showZWaveJSRemoveNodeDialog } from "./show-dialog-zwave_js-remove-node";
import "../../../../../components/ha-list-item";
import "../../../../../components/ha-icon-next";

enum Status {
  Start = "start",
  StartLiveNode = "start_live_node",
  Started = "started",
  Failed = "failed",
  Finished = "finished",
}

@customElement("dialog-zwave_js-remove-failed-node")
class DialogZWaveJSRemoveFailedNode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private deviceId?: string;

  @state() private nodeStatus?: ZWaveJSNodeStatus;

  @state() private configEntryId?: string;

  @state() private _status = Status.Start;

  @state() private _error?: any;

  @state() private _node?: ZWaveJSRemovedNode;

  private _subscribed?: Promise<UnsubscribeFunc | undefined>;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe();
  }

  public async showDialog(
    params: ZWaveJSRemoveFailedNodeDialogParams
  ): Promise<void> {
    this.deviceId = params.device_id;
    this.configEntryId = params.config_entry_id;
    this.nodeStatus = await fetchZwaveNodeStatus(this.hass, this.deviceId!);
    this._status =
      this.nodeStatus.status === NodeStatus.Dead
        ? Status.Start
        : Status.StartLiveNode;
  }

  public closeDialog(): void {
    this._unsubscribe();
    this.deviceId = undefined;
    this.nodeStatus = undefined;

    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public closeDialogFinished(): void {
    history.back();
    this.closeDialog();
  }

  protected render() {
    if (!this.deviceId || !this.nodeStatus) {
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
        .hideActions=${this._status === Status.StartLiveNode}
      >
        ${this._status === Status.StartLiveNode
          ? html`
              <div class="menu-introduction">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.remove_failed_node.exclusion_prompt"
                )}
              </div>
              <div class="menu-options">
                <ha-list-item hasMeta @click=${this._startExclusion}>
                  <span
                    >${this.hass.localize(
                      "ui.panel.config.zwave_js.remove_failed_node.exclude_device"
                    )}</span
                  >
                  <ha-icon-next slot="meta"></ha-icon-next>
                </ha-list-item>
                <ha-list-item hasMeta @click=${this._startRemoval}>
                  <span
                    >${this.hass.localize(
                      "ui.panel.config.zwave_js.remove_failed_node.remove_device"
                    )}</span
                  >
                  <ha-icon-next slot="meta"></ha-icon-next>
                </ha-list-item>
              </div>
            `
          : this._status === Status.Start
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
                <mwc-button slot="primaryAction" @click=${this._startRemoval}>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.remove_failed_node.remove_device"
                  )}
                </mwc-button>
              `
            : this._status === Status.Started
              ? html`
                  <div class="flex-container">
                    <ha-spinner></ha-spinner>
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
              : this._status === Status.Failed
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
                          : nothing}
                      </div>
                    </div>
                    <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                      ${this.hass.localize("ui.common.close")}
                    </mwc-button>
                  `
                : this._status === Status.Finished
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
                              { id: this._node!.node_id }
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
                  : nothing}
      </ha-dialog>
    `;
  }

  private _startRemoval(): void {
    if (!this.hass) {
      return;
    }
    this._status = Status.Started;
    this._subscribed = removeFailedZwaveNode(
      this.hass,
      this.deviceId!,
      (message: any) => this._handleMessage(message)
    ).catch((error) => {
      this._status = Status.Failed;
      this._error = error;
      return undefined;
    });
  }

  private _startExclusion(): void {
    this.closeDialog();
    showZWaveJSRemoveNodeDialog(this, {
      entry_id: this.configEntryId!,
      skipConfirmation: true,
    });
  }

  private _handleMessage(message: any): void {
    if (message.event === "exclusion started") {
      this._status = Status.Started;
    }
    if (message.event === "node removed") {
      this._status = Status.Finished;
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
    if (this._status !== Status.Finished) {
      this._status = Status.Start;
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

        .flex-container ha-spinner,
        .flex-container ha-svg-icon {
          margin-right: 20px;
          margin-inline-end: 20px;
          margin-inline-start: initial;
        }

        .menu-introduction {
          padding-bottom: 16px;
          border-bottom: 1px solid var(--divider-color);
        }

        .menu-options {
          margin-top: 8px;
        }

        ha-list-item {
          --mdc-list-side-padding: 24px;
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
