import "@material/mwc-button/mwc-button";
import "@material/mwc-linear-progress/mwc-linear-progress";
import { mdiCheckCircle, mdiCloseCircle, mdiStethoscope } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import {
  fetchZwaveNetworkStatus,
  rebuildZwaveNetworkRoutes,
  stopRebuildingZwaveNetworkRoutes,
  subscribeRebuildZwaveNetworkRoutesProgress,
  ZWaveJSRebuildRoutesStatusMessage,
  ZWaveJSNetwork,
} from "../../../../../data/zwave_js";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ZWaveJSRebuildNetworkRoutesDialogParams } from "./show-dialog-zwave_js-rebuild-network-routes";

@customElement("dialog-zwave_js-rebuild-network-routes")
class DialogZWaveJSRebuildNetworkRoutes extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private entry_id?: string;

  @state() private _status?: string;

  @state() private _progress_total = 0;

  @state() private _progress_finished = 0;

  @state() private _progress_in_progress = 0;

  private _subscribed?: Promise<UnsubscribeFunc>;

  public showDialog(params: ZWaveJSRebuildNetworkRoutesDialogParams): void {
    this._progress_total = 0;
    this.entry_id = params.entry_id;
    this._fetchData();
  }

  public closeDialog(): void {
    this.entry_id = undefined;
    this._status = undefined;
    this._progress_total = 0;

    this._unsubscribe();

    fireEvent(this, "dialog-closed", { dialog: this.localName });
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
          this.hass.localize(
            "ui.panel.config.zwave_js.rebuild_network_routes.title"
          )
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
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.rebuild_network_routes.introduction"
                    )}
                  </p>
                </div>
              </div>
              <p>
                <em>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.rebuild_network_routes.traffic_warning"
                  )}
                </em>
              </p>
              <mwc-button
                slot="primaryAction"
                @click=${this._startRebuildingRoutes}
              >
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.rebuild_network_routes.start_rebuilding_routes"
                )}
              </mwc-button>
            `
          : ``}
        ${this._status === "started"
          ? html`
              <div class="status">
                <p>
                  <b>
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.rebuild_network_routes.in_progress"
                    )}
                  </b>
                </p>
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.rebuild_network_routes.run_in_background"
                  )}
                </p>
              </div>
              ${!this._progress_total
                ? html`
                    <mwc-linear-progress indeterminate> </mwc-linear-progress>
                  `
                : ""}
              <mwc-button
                slot="secondaryAction"
                @click=${this._stopRebuildingRoutes}
              >
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.rebuild_network_routes.stop_rebuilding_routes"
                )}
              </mwc-button>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.common.close")}
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
                      "ui.panel.config.zwave_js.rebuild_network_routes.rebuilding_routes_failed"
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
                      "ui.panel.config.zwave_js.rebuild_network_routes.rebuilding_routes_complete"
                    )}
                  </p>
                </div>
              </div>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.common.close")}
              </mwc-button>
            `
          : ``}
        ${this._status === "cancelled"
          ? html`
              <div class="flex-container">
                <ha-svg-icon
                  .path=${mdiCloseCircle}
                  class="failed"
                ></ha-svg-icon>
                <div class="status">
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.rebuild_network_routes.rebuilding_routes_cancelled"
                    )}
                  </p>
                </div>
              </div>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.common.close")}
              </mwc-button>
            `
          : ``}
        ${this._progress_total && this._status !== "finished"
          ? html`
              <mwc-linear-progress
                determinate
                .progress=${this._progress_finished}
                .buffer=${this._progress_in_progress}
              >
              </mwc-linear-progress>
            `
          : ""}
      </ha-dialog>
    `;
  }

  private async _fetchData(): Promise<void> {
    if (!this.hass) {
      return;
    }
    const network: ZWaveJSNetwork = await fetchZwaveNetworkStatus(this.hass!, {
      entry_id: this.entry_id!,
    });
    if (network.controller.is_rebuilding_routes) {
      this._status = "started";
      this._subscribed = subscribeRebuildZwaveNetworkRoutesProgress(
        this.hass,
        this.entry_id!,
        this._handleMessage.bind(this)
      );
    }
  }

  private _startRebuildingRoutes(): void {
    if (!this.hass) {
      return;
    }
    rebuildZwaveNetworkRoutes(this.hass, this.entry_id!);
    this._status = "started";
    this._subscribed = subscribeRebuildZwaveNetworkRoutesProgress(
      this.hass,
      this.entry_id!,
      this._handleMessage.bind(this)
    );
  }

  private _stopRebuildingRoutes(): void {
    if (!this.hass) {
      return;
    }
    stopRebuildingZwaveNetworkRoutes(this.hass, this.entry_id!);
    this._unsubscribe();
    this._status = "cancelled";
  }

  private _handleMessage(message: ZWaveJSRebuildRoutesStatusMessage): void {
    if (message.event === "rebuild routes progress") {
      let finished = 0;
      let in_progress = 0;
      for (const status of Object.values(message.rebuild_routes_status)) {
        if (status === "pending") {
          in_progress++;
        }
        if (["skipped", "failed", "done"].includes(status)) {
          finished++;
        }
      }
      this._progress_total = Object.keys(message.rebuild_routes_status).length;
      this._progress_finished = finished / this._progress_total;
      this._progress_in_progress = in_progress / this._progress_total;
    }
    if (message.event === "rebuild routes done") {
      this._unsubscribe();
      this._status = "finished";
    }
  }

  private _unsubscribe(): void {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
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
