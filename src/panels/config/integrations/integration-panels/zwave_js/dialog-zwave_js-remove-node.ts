import {
  mdiCheckCircle,
  mdiClose,
  mdiCloseCircle,
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

const EXCLUSION_TIMEOUT_SECONDS = 120;

export interface ZWaveJSRemovedNode {
  node_id: number;
  manufacturer: string;
  label: string;
}

@customElement("dialog-zwave_js-remove-node")
class DialogZWaveJSRemoveNode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private entry_id?: string;

  @state() private _step:
    | "start"
    | "exclusion"
    | "remove"
    | "finished"
    | "failed"
    | "timeout" = "start";

  @state() private _node?: ZWaveJSRemovedNode;

  @state() private _removedCallback?: () => void;

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
    this.entry_id = params.entry_id;
    this._removedCallback = params.removedCallback;
    if (params.skipConfirmation) {
      this._startExclusion();
    }
  }

  protected render() {
    if (!this.entry_id) {
      return nothing;
    }

    const dialogTitle = this.hass.localize(
      "ui.panel.config.zwave_js.remove_node.title"
    );

    return html`
      <ha-dialog open @closed=${this.closeDialog} .heading=${dialogTitle}>
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

  private _renderAction(): TemplateResult {
    return html`
      <ha-button
        slot="primaryAction"
        @click=${this._step === "start"
          ? this._startExclusion
          : this.closeDialog}
      >
        ${this.hass.localize(
          this._step === "start"
            ? "ui.panel.config.zwave_js.remove_node.start_exclusion"
            : this._step === "exclusion"
              ? "ui.panel.config.zwave_js.remove_node.cancel_exclusion"
              : "ui.common.close"
        )}
      </ha-button>
    `;
  }

  private _startExclusion(): void {
    this._subscribed = this.hass.connection
      .subscribeMessage((message) => this._handleMessage(message), {
        type: "zwave_js/remove_node",
        entry_id: this.entry_id,
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

  private _handleMessage(message: any): void {
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
      if (this._removedCallback) {
        this._removedCallback();
      }
    }
  }

  private _stopExclusion(): void {
    try {
      this.hass.callWS({
        type: "zwave_js/stop_exclusion",
        entry_id: this.entry_id,
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
    if (this._step === "exclusion") {
      this._stopExclusion();
    }
    if (this._removeNodeTimeoutHandle) {
      clearTimeout(this._removeNodeTimeoutHandle);
    }
  };

  public closeDialog(): void {
    this._unsubscribe();
    this.entry_id = undefined;
    this._step = "start";

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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zwave_js-remove-node": DialogZWaveJSRemoveNode;
  }
}
