import { consume, provide, type ContextType } from "@lit/context";
import {
  mdiAlert,
  mdiCheckCircle,
  mdiCloseCircle,
  mdiSkipNext,
  mdiStethoscope,
  mdiSync,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../../../../../../components/ha-button";
import type { HaButton } from "../../../../../../components/ha-button";
import "../../../../../../components/ha-dialog";
import "../../../../../../components/ha-dialog-footer";
import "../../../../../../components/ha-fade-in";
import "../../../../../../components/ha-spinner";
import "../../../../../../components/progress/ha-progress-bar";
import {
  connectionContext,
  internationalizationContext,
} from "../../../../../../data/context/context";
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
import {
  zwaveJsRebuildNetworkRoutesProgressContext,
  type ZWaveJSRebuildNetworkRoutesProgress,
} from "./context";
import type { ZWaveJSRebuildNetworkRoutesDialogParams } from "./show-dialog-zwave_js-rebuild-network-routes";
import { showZWaveJSRebuildNetworkRoutesDetailDialog } from "./show-dialog-zwave_js-rebuild-network-routes-detail";

@customElement("dialog-zwave_js-rebuild-network-routes")
class DialogZWaveJSRebuildNetworkRoutes extends DialogMixin<ZWaveJSRebuildNetworkRoutesDialogParams>(
  LitElement
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  @provide({ context: zwaveJsRebuildNetworkRoutesProgressContext })
  @state()
  private _progress?: ZWaveJSRebuildNetworkRoutesProgress;

  @state() private _status?:
    | "ready"
    | "started"
    | "failed"
    | "finished"
    | "cancelled";

  private _subscribed?: Promise<UnsubscribeFunc>;

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
        header-title=${this._i18n.localize(
          "ui.panel.config.zwave_js.rebuild_network_routes.title"
        )}
      >
        ${!this._status
          ? html`
              <ha-fade-in .delay=${500}
                ><ha-spinner size="large"></ha-spinner
              ></ha-fade-in>
            `
          : this._status === "ready"
            ? html`
                <div class="flex-container">
                  <ha-svg-icon
                    .path=${mdiStethoscope}
                    class="status-icon introduction"
                  ></ha-svg-icon>
                  <div class="status">
                    <p>
                      ${this._i18n.localize(
                        "ui.panel.config.zwave_js.rebuild_network_routes.introduction"
                      )}
                    </p>
                  </div>
                </div>
                <p>
                  <em>
                    ${this._i18n.localize(
                      "ui.panel.config.zwave_js.rebuild_network_routes.traffic_warning"
                    )}
                  </em>
                </p>
              `
            : this._status === "started"
              ? html`
                  <div class="status">
                    <p>
                      <b>
                        ${this._i18n.localize(
                          "ui.panel.config.zwave_js.rebuild_network_routes.in_progress"
                        )}
                      </b>
                    </p>
                    <p>
                      ${this._i18n.localize(
                        "ui.panel.config.zwave_js.rebuild_network_routes.run_in_background"
                      )}
                    </p>
                  </div>
                  <ha-progress-bar
                    loading
                    .indeterminate=${!this._progress}
                    .value=${this._progress
                      ? this._progressPercent(this._progress)
                      : undefined}
                  >
                  </ha-progress-bar>
                  ${this._progress
                    ? html` <div class="progress-detail">
                        <ha-button
                          .progressType=${"pending"}
                          @click=${this._showProgressDetail}
                          appearance="outlined"
                          variant="warning"
                          size="small"
                          .title=${this._i18n.localize(
                            "ui.panel.config.zwave_js.rebuild_network_routes.progress.in_progress",
                            { count: this._progress.pending.length }
                          )}
                        >
                          ${this._progress.pending.length}
                          <ha-svg-icon
                            .path=${mdiSync}
                            slot="end"
                          ></ha-svg-icon>
                        </ha-button>
                        <ha-button
                          .progressType=${"done"}
                          @click=${this._showProgressDetail}
                          appearance="outlined"
                          variant="success"
                          size="small"
                          .title=${this._i18n.localize(
                            "ui.panel.config.zwave_js.rebuild_network_routes.progress.completed",
                            { count: this._progress.done.length }
                          )}
                        >
                          ${this._progress.done.length}
                          <ha-svg-icon
                            .path=${mdiCheckCircle}
                            slot="end"
                          ></ha-svg-icon>
                        </ha-button>

                        ${this._progress.failed.length
                          ? html`<ha-button
                              .progressType=${"failed"}
                              @click=${this._showProgressDetail}
                              appearance="outlined"
                              variant="danger"
                              size="small"
                              .title=${this._i18n.localize(
                                "ui.panel.config.zwave_js.rebuild_network_routes.progress.failed",
                                { count: this._progress.failed.length }
                              )}
                            >
                              ${this._progress.failed.length}
                              <ha-svg-icon
                                .path=${mdiAlert}
                                slot="end"
                              ></ha-svg-icon>
                            </ha-button>`
                          : nothing}
                        ${this._progress.skipped.length
                          ? html`<ha-button
                              .progressType=${"skipped"}
                              @click=${this._showProgressDetail}
                              appearance="outlined"
                              variant="neutral"
                              size="small"
                              .title=${this._i18n.localize(
                                "ui.panel.config.zwave_js.rebuild_network_routes.progress.skipped",
                                { count: this._progress.skipped.length }
                              )}
                            >
                              ${this._progress.skipped.length}
                              <ha-svg-icon
                                .path=${mdiSkipNext}
                                slot="end"
                              ></ha-svg-icon>
                            </ha-button>`
                          : nothing}
                      </div>`
                    : nothing}
                `
              : this._status === "failed"
                ? html`
                    <div class="flex-container">
                      <ha-svg-icon
                        .path=${mdiCloseCircle}
                        class="status-icon failed"
                      ></ha-svg-icon>
                      <div class="status">
                        <p>
                          ${this._i18n.localize(
                            "ui.panel.config.zwave_js.rebuild_network_routes.rebuilding_routes_failed"
                          )}
                        </p>
                      </div>
                    </div>
                  `
                : this._status === "finished"
                  ? html`
                      <div class="flex-container">
                        <ha-svg-icon
                          .path=${mdiCheckCircle}
                          class="status-icon success"
                        ></ha-svg-icon>
                        <div class="status">
                          <p>
                            ${this._i18n.localize(
                              "ui.panel.config.zwave_js.rebuild_network_routes.rebuilding_routes_complete"
                            )}
                          </p>
                        </div>
                      </div>
                    `
                  : this._status === "cancelled"
                    ? html`
                        <div class="flex-container">
                          <ha-svg-icon
                            .path=${mdiCloseCircle}
                            class="status-icon failed"
                          ></ha-svg-icon>
                          <div class="status">
                            <p>
                              ${this._i18n.localize(
                                "ui.panel.config.zwave_js.rebuild_network_routes.rebuilding_routes_cancelled"
                              )}
                            </p>
                          </div>
                        </div>
                      `
                    : nothing}
        <ha-dialog-footer slot="footer">
          ${this._status === "ready"
            ? html`
                <ha-button
                  slot="primaryAction"
                  @click=${this._startRebuildingRoutes}
                >
                  ${this._i18n.localize(
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
                    ${this._i18n.localize(
                      "ui.panel.config.zwave_js.rebuild_network_routes.stop_rebuilding_routes"
                    )}
                  </ha-button>
                  <ha-button slot="primaryAction" @click=${this.closeDialog}>
                    ${this._i18n.localize("ui.common.close")}
                  </ha-button>
                `
              : html`
                  <ha-button slot="primaryAction" @click=${this.closeDialog}>
                    ${this._i18n.localize("ui.common.close")}
                  </ha-button>
                `}
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private async _fetchData(): Promise<void> {
    const network: ZWaveJSNetwork = await fetchZwaveNetworkStatus(
      this._connection.connection,
      {
        entry_id: this.params!.entry_id,
      }
    );
    if (network.controller.is_rebuilding_routes) {
      this._status = "started";
      this._startSubscribingToProgress();
    } else {
      this._status = "ready";
    }
  }

  private _startRebuildingRoutes(): void {
    rebuildZwaveNetworkRoutes(
      this._connection.connection,
      this.params!.entry_id
    );
    this._status = "started";
    this._startSubscribingToProgress();
  }

  private async _startSubscribingToProgress() {
    this._subscribed = subscribeRebuildZwaveNetworkRoutesProgress(
      this._connection.connection,
      this.params!.entry_id,
      this._handleMessage
    );
  }

  private _stopRebuildingRoutes(): void {
    stopRebuildingZwaveNetworkRoutes(
      this._connection.connection,
      this.params!.entry_id
    );
    this._unsubscribe();
    this._status = "cancelled";
  }

  private _handleMessage = (message: ZWaveJSRebuildRoutesStatusMessage) => {
    if (message.event === "rebuild routes progress") {
      const progressNumbers: ZWaveJSRebuildNetworkRoutesProgress = {
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
    (progress: ZWaveJSRebuildNetworkRoutesProgress) => {
      const done =
        progress.done.length + progress.skipped.length + progress.failed.length;
      const total = done + progress.pending.length;
      return total > 0 ? (done / total) * 100 : 0;
    }
  );

  private _showProgressDetail(ev: Event) {
    const button = ev.target as HaButton & {
      progressType: "pending" | "skipped" | "failed" | "done";
    };
    showZWaveJSRebuildNetworkRoutesDetailDialog(this, {
      type: button.progressType,
      configEntryId: this.params!.entry_id,
    });
  }

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

        ha-svg-icon.status-icon {
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

        ha-progress-bar {
          margin-top: var(--ha-space-8);
        }

        .progress-detail {
          margin-top: var(--ha-space-4);
          display: flex;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: var(--ha-space-3);
        }

        .progress-detail ha-button {
          --ha-font-weight-medium: var(--ha-font-weight-normal);
        }
        .progress-detail ha-button::part(label) {
          white-space: nowrap;
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
