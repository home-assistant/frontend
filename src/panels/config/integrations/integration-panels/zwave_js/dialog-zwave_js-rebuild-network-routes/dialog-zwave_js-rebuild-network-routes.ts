import { consume, type ContextType } from "@lit/context";
import "@material/mwc-linear-progress/mwc-linear-progress";
import { mdiCheckCircle, mdiCloseCircle, mdiStethoscope } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../../../../../../components/ha-button";
import "../../../../../../components/ha-dialog";
import "../../../../../../components/ha-dialog-footer";
import {
  connectionContext,
  localizeContext,
} from "../../../../../../data/context";
import type {
  ZWaveJSNetwork,
  ZWaveJSRebuildRoutesStatusMessage,
} from "../../../../../../data/zwave_js";
import {
  fetchZwaveNetworkStatus,
  rebuildZwaveNetworkRoutes,
  stopRebuildingZwaveNetworkRoutes,
  subscribeRebuildZwaveNetworkRoutesProgress,
} from "../../../../../../data/zwave_js";
import { DialogMixin } from "../../../../../../dialogs/dialog-mixin";
import type { ZWaveJSRebuildNetworkRoutesDialogParams } from "./show-dialog-zwave_js-rebuild-network-routes";

@customElement("dialog-zwave_js-rebuild-network-routes")
class DialogZWaveJSRebuildNetworkRoutes extends DialogMixin<ZWaveJSRebuildNetworkRoutesDialogParams>(
  LitElement
) {
  @state() private _status?: string;

  @state() private _progress?: {
    pending: number[];
    skipped: number[];
    done: number[];
    failed: number[];
  };

  private _subscribed?: Promise<UnsubscribeFunc>;

  @state()
  @consume({ context: localizeContext, subscribe: true })
  private _localize!: ContextType<typeof localizeContext>;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  connectedCallback() {
    super.connectedCallback();
    if (this.params?.entry_id) {
      this._fetchData();
    }
  }

  protected render() {
    if (!this.params || !this.params.entry_id) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        header-title=${this._localize(
          "ui.panel.config.zwave_js.rebuild_network_routes.title"
        )}
      >
        ${!this._status
          ? html`
              <div class="flex-container">
                <ha-svg-icon
                  .path=${mdiStethoscope}
                  class="introduction"
                ></ha-svg-icon>
                <div class="status">
                  <p>
                    ${this._localize(
                      "ui.panel.config.zwave_js.rebuild_network_routes.introduction"
                    )}
                  </p>
                </div>
              </div>
              <p>
                <em>
                  ${this._localize(
                    "ui.panel.config.zwave_js.rebuild_network_routes.traffic_warning"
                  )}
                </em>
              </p>
            `
          : nothing}
        ${this._status === "started"
          ? html`
              <div class="status">
                <p>
                  <b>
                    ${this._localize(
                      "ui.panel.config.zwave_js.rebuild_network_routes.in_progress"
                    )}
                  </b>
                </p>
                <p>
                  ${this._localize(
                    "ui.panel.config.zwave_js.rebuild_network_routes.run_in_background"
                  )}
                </p>
              </div>
              ${!this._progress
                ? html`
                    <mwc-linear-progress indeterminate> </mwc-linear-progress>
                  `
                : nothing}
            `
          : nothing}
        ${this._status === "failed"
          ? html`
              <div class="flex-container">
                <ha-svg-icon
                  .path=${mdiCloseCircle}
                  class="failed"
                ></ha-svg-icon>
                <div class="status">
                  <p>
                    ${this._localize(
                      "ui.panel.config.zwave_js.rebuild_network_routes.rebuilding_routes_failed"
                    )}
                  </p>
                </div>
              </div>
            `
          : nothing}
        ${this._status === "finished"
          ? html`
              <div class="flex-container">
                <ha-svg-icon
                  .path=${mdiCheckCircle}
                  class="success"
                ></ha-svg-icon>
                <div class="status">
                  <p>
                    ${this._localize(
                      "ui.panel.config.zwave_js.rebuild_network_routes.rebuilding_routes_complete"
                    )}
                  </p>
                </div>
              </div>
            `
          : nothing}
        ${this._status === "cancelled"
          ? html`
              <div class="flex-container">
                <ha-svg-icon
                  .path=${mdiCloseCircle}
                  class="failed"
                ></ha-svg-icon>
                <div class="status">
                  <p>
                    ${this._localize(
                      "ui.panel.config.zwave_js.rebuild_network_routes.rebuilding_routes_cancelled"
                    )}
                  </p>
                </div>
              </div>
            `
          : nothing}
        ${this._progress && this._status !== "finished"
          ? html`
              <mwc-linear-progress
                determinate
                .progress=${this._progressPercent(this._progress)}
                .buffer=${this._progress.pending.length}
              >
              </mwc-linear-progress>

              <ul>
                <li>Done: ${this._progress.done.length}</li>
                <li>Skipped: ${this._progress.skipped.length}</li>
                <li>Pending: ${this._progress.pending.length}</li>
                <li>Failed: ${this._progress.failed.length}</li>
              </ul>
            `
          : nothing}
        <ha-dialog-footer slot="footer">
          ${!this._status
            ? html`
                <ha-button
                  slot="primaryAction"
                  @click=${this._startRebuildingRoutes}
                >
                  ${this._localize(
                    "ui.panel.config.zwave_js.rebuild_network_routes.start_rebuilding_routes"
                  )}
                </ha-button>
              `
            : this._status === "started"
              ? html`
                  <ha-button
                    slot="secondaryAction"
                    appearance="plain"
                    @click=${this._stopRebuildingRoutes}
                    variant="danger"
                  >
                    ${this._localize(
                      "ui.panel.config.zwave_js.rebuild_network_routes.stop_rebuilding_routes"
                    )}
                  </ha-button>
                  <ha-button slot="primaryAction" @click=${this.closeDialog}>
                    ${this._localize("ui.common.close")}
                  </ha-button>
                `
              : html`
                  <ha-button slot="primaryAction" @click=${this.closeDialog}>
                    ${this._localize("ui.common.close")}
                  </ha-button>
                `}
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private async _fetchData(): Promise<void> {
    const network: ZWaveJSNetwork = await fetchZwaveNetworkStatus(
      this._connection,
      {
        entry_id: this.params!.entry_id,
      }
    );
    if (network.controller.is_rebuilding_routes) {
      this._status = "started";
      this._startSubscribingToProgress();
    }
  }

  private _startRebuildingRoutes(): void {
    rebuildZwaveNetworkRoutes(this._connection, this.params!.entry_id);
    this._status = "started";
    this._startSubscribingToProgress();
  }

  private _startSubscribingToProgress() {
    // TODO initial message isn't handled
    this._subscribed = subscribeRebuildZwaveNetworkRoutesProgress(
      this._connection,
      this.params!.entry_id,
      this._handleMessage
    );
  }

  private _stopRebuildingRoutes(): void {
    stopRebuildingZwaveNetworkRoutes(this._connection, this.params!.entry_id);
    this._unsubscribe();
    this._status = "cancelled";
  }

  private _handleMessage = (message: ZWaveJSRebuildRoutesStatusMessage) => {
    if (message.event === "rebuild routes progress") {
      const progressNumbers: typeof this._progress = {
        pending: [],
        skipped: [],
        done: [],
        failed: [],
      };
      for (const [nodeId, status] of Object.entries(
        message.rebuild_routes_status
      )) {
        progressNumbers[status].push(Number(nodeId));
      }
      this._progress = progressNumbers;
    }
    if (message.event === "rebuild routes done") {
      this._unsubscribe();
      this._status = "finished";
    }
  };

  private _progressPercent = memoizeOne(
    (progress: typeof this._progress) =>
      (progress!.done.length +
        progress!.skipped.length +
        progress!.failed.length) /
      (progress!.done.length +
        progress!.skipped.length +
        progress!.failed.length +
        progress!.pending.length)
  );

  private _unsubscribe(): void {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe();
  }

  static get styles(): CSSResultGroup {
    return [
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

        ha-svg-icon.introduction {
          color: var(--primary-color);
        }

        .flex-container ha-svg-icon {
          margin-right: 20px;
          margin-inline-end: 20px;
          margin-inline-start: initial;
        }

        mwc-linear-progress {
          margin-top: 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zwave_js-rebuild-network-routes": DialogZWaveJSRebuildNetworkRoutes;
  }
}
