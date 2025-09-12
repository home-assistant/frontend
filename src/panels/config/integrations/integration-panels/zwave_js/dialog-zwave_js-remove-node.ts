import {
  mdiCheckCircle,
  mdiClose,
  mdiCloseCircle,
  mdiRobotDead,
  mdiVectorSquareRemove,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-dialog-header";
import "../../../../../components/ha-spinner";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { ZWaveJSRemoveNodeDialogParams } from "./show-dialog-zwave_js-remove-node";
import {
  fetchZwaveNodeStatus,
  NodeStatus,
  removeFailedZwaveNode,
} from "../../../../../data/zwave_js";
import "../../../../../components/ha-list-item";
import "../../../../../components/ha-icon-next";
import type { DeviceRegistryEntry } from "../../../../../data/device_registry";

const EXCLUSION_TIMEOUT_SECONDS = 120;

export interface ZWaveJSRemovedNode {
  node_id: number;
  manufacturer: string;
  label: string;
}

@customElement("dialog-zwave_js-remove-node")
class DialogZWaveJSRemoveNode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _entryId?: string;

  @state() private _deviceId?: string;

  private _device?: DeviceRegistryEntry;

  @state() private _step:
    | "start"
    | "start_exclusion"
    | "start_removal"
    | "exclusion"
    | "remove"
    | "finished"
    | "failed"
    | "timeout" = "start";

  @state() private _node?: ZWaveJSRemovedNode;

  @state() private _onClose?: () => void;

  private _removeNodeTimeoutHandle?: number;

  private _subscribed?: Promise<UnsubscribeFunc | undefined>;

  @state() private _error?: string;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe();
  }

  public async showDialog(
    params: ZWaveJSRemoveNodeDialogParams
  ): Promise<void> {
    this._entryId = params.entryId;
    this._deviceId = params.deviceId;
    this._onClose = params.onClose;
    if (this._deviceId) {
      const nodeStatus = await fetchZwaveNodeStatus(this.hass, this._deviceId!);
      this._device = this.hass.devices[this._deviceId];
      this._step =
        nodeStatus.status === NodeStatus.Dead ? "start_removal" : "start";
    } else if (params.skipConfirmation) {
      this._startExclusion();
    } else {
      this._step = "start_exclusion";
    }
  }

  protected render() {
    if (!this._entryId) {
      return nothing;
    }

    const dialogTitle = this.hass.localize(
      "ui.panel.config.zwave_js.remove_node.title"
    );

    return html`
      <ha-dialog
        open
        @closed=${this.handleDialogClosed}
        .heading=${dialogTitle}
        .hideActions=${this._step === "start"}
      >
        <ha-dialog-header slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            .path=${mdiClose}
            @click=${this.closeDialog}
            .label=${this.hass.localize("ui.common.close")}
          ></ha-icon-button>
          <span slot="title">${dialogTitle}</span>
        </ha-dialog-header>
        <div class="content">${this._renderStepContent()}</div>
        ${this._renderAction()}
      </ha-dialog>
    `;
  }

  private _renderStepContent(): TemplateResult {
    if (this._step === "start") {
      return html`
        <ha-svg-icon .path=${mdiVectorSquareRemove}></ha-svg-icon>
        <p>
          ${this.hass.localize(
            "ui.panel.config.zwave_js.remove_node.introduction"
          )}
        </p>
        <div class="menu-options">
          <ha-list-item hasMeta @click=${this._startExclusion}>
            <span
              >${this.hass.localize(
                "ui.panel.config.zwave_js.remove_node.menu_exclude_device"
              )}</span
            >
            <ha-icon-next slot="meta"></ha-icon-next>
          </ha-list-item>
          <ha-list-item hasMeta @click=${this._startRemoval}>
            <span
              >${this.hass.localize(
                "ui.panel.config.zwave_js.remove_node.menu_remove_device"
              )}</span
            >
            <ha-icon-next slot="meta"></ha-icon-next>
          </ha-list-item>
        </div>
      `;
    }

    if (this._step === "start_removal") {
      return html`
        <ha-svg-icon .path=${mdiRobotDead}></ha-svg-icon>
        <p>
          ${this.hass.localize(
            "ui.panel.config.zwave_js.remove_node.failed_node_intro",
            { name: this._device!.name_by_user || this._device!.name }
          )}
        </p>
      `;
    }

    if (this._step === "start_exclusion") {
      return html`
        <ha-svg-icon .path=${mdiVectorSquareRemove}></ha-svg-icon>
        <p>
          ${this.hass.localize(
            "ui.panel.config.zwave_js.remove_node.exclusion_intro"
          )}
        </p>
      `;
    }

    if (["exclusion", "remove"].includes(this._step)) {
      return html`
        <ha-spinner></ha-spinner>
        <div>
          <p>
            ${this.hass.localize(
              `ui.panel.config.zwave_js.remove_node.${this._step === "exclusion" ? "follow_device_instructions" : "removing_device"}`
            )}
          </p>
        </div>
      `;
    }

    if (this._step === "finished") {
      return html` <ha-svg-icon
          .path=${mdiCheckCircle}
          class="success"
        ></ha-svg-icon>
        <p>
          ${this.hass.localize(
            "ui.panel.config.zwave_js.remove_node.exclusion_finished",
            { id: html`<b>${this._node!.node_id}</b>` }
          )}
        </p>`;
    }

    // failed
    return html`
      <ha-svg-icon .path=${mdiCloseCircle} class="failed"></ha-svg-icon>
      <p>
        ${this.hass.localize(
          "ui.panel.config.zwave_js.remove_node.exclusion_failed"
        )}
      </p>
      ${this._error
        ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
        : nothing}
    `;
  }

  private _renderAction() {
    if (this._step === "start") {
      return nothing;
    }

    if (this._step === "start_removal") {
      return html`
        <ha-button
          appearance="plain"
          slot="secondaryAction"
          @click=${this.closeDialog}
        >
          ${this.hass.localize("ui.common.cancel")}
        </ha-button>
        <ha-button
          slot="primaryAction"
          @click=${this._startRemoval}
          destructive
        >
          ${this.hass.localize("ui.common.remove")}
        </ha-button>
      `;
    }

    if (this._step === "start_exclusion") {
      return html`
        <ha-button
          appearance="plain"
          slot="secondaryAction"
          @click=${this.closeDialog}
        >
          ${this.hass.localize("ui.common.cancel")}
        </ha-button>
        <ha-button
          slot="primaryAction"
          @click=${this._startExclusion}
          destructive
        >
          ${this.hass.localize(
            "ui.panel.config.zwave_js.remove_node.start_exclusion"
          )}
        </ha-button>
      `;
    }

    return html`
      <ha-button slot="primaryAction" @click=${this.closeDialog}>
        ${this.hass.localize(
          this._step === "exclusion"
            ? "ui.panel.config.zwave_js.remove_node.cancel_exclusion"
            : "ui.common.close"
        )}
      </ha-button>
    `;
  }

  private _startExclusion() {
    this._subscribed = this.hass.connection
      .subscribeMessage(this._handleMessage, {
        type: "zwave_js/remove_node",
        entry_id: this._entryId,
      })
      .catch((err) => {
        this._step = "failed";
        this._error = err.message;
        return undefined;
      });
    this._step = "exclusion";
    this._removeNodeTimeoutHandle = window.setTimeout(() => {
      this._unsubscribe();
      this._step = "timeout";
    }, EXCLUSION_TIMEOUT_SECONDS * 1000);
  }

  private _startRemoval() {
    this._subscribed = removeFailedZwaveNode(
      this.hass,
      this._deviceId!,
      this._handleMessage
    ).catch((err) => {
      this._step = "failed";
      this._error = err.message;
      return undefined;
    });
    this._step = "remove";
  }

  private _handleMessage = (message: any) => {
    if (message.event === "exclusion failed") {
      this._unsubscribe();
      this._step = "failed";
    }
    if (message.event === "exclusion stopped") {
      this._step = "remove";
    }
    if (message.event === "node removed") {
      this._step = "finished";
      this._node = message.node;
      this._unsubscribe();
    }
  };

  private _stopExclusion(): void {
    try {
      this.hass.callWS({
        type: "zwave_js/stop_exclusion",
        entry_id: this._entryId,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  private _unsubscribe = () => {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub && unsub());
      this._subscribed = undefined;
    }
    if (this._step === "exclusion" && this._entryId) {
      this._stopExclusion();
    }
    if (this._removeNodeTimeoutHandle) {
      clearTimeout(this._removeNodeTimeoutHandle);
    }
  };

  public closeDialog(): void {
    this._unsubscribe();
    this._entryId = undefined;
  }

  public handleDialogClosed(): void {
    this._unsubscribe();
    this._entryId = undefined;
    this._step = "start";
    if (this._onClose) {
      this._onClose();
    }
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .content {
          display: flex;
          align-items: center;
          flex-direction: column;
          gap: 16px;
          text-align: center;
        }

        .content ha-spinner {
          padding: 32px 0;
        }

        .content p {
          color: var(--secondary-text-color);
        }

        ha-svg-icon {
          padding: 32px 0;
          width: 48px;
          height: 48px;
        }
        ha-svg-icon.success {
          color: var(--success-color);
        }

        ha-svg-icon.failed {
          color: var(--error-color);
        }
        ha-alert {
          width: 100%;
        }

        .menu-options {
          align-self: stretch;
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
    "dialog-zwave_js-remove-node": DialogZWaveJSRemoveNode;
  }
}
