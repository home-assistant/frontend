import "@material/mwc-button/mwc-button";
import "@material/mwc-linear-progress/mwc-linear-progress";
import { mdiStethoscope, mdiCheckCircle, mdiCloseCircle } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import {
  fetchZwaveNetworkStatus,
  healZwaveNetwork,
  stopHealZwaveNetwork,
  subscribeHealZwaveNetworkProgress,
  ZWaveJSHealNetworkStatusMessage,
  ZWaveJSNetwork,
} from "../../../../../data/zwave_js";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ZWaveJSHealNetworkDialogParams } from "./show-dialog-zwave_js-heal-network";

@customElement("dialog-zwave_js-heal-network")
class DialogZWaveJSHealNetwork extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private entry_id?: string;

  @state() private _status?: string;

  @state() private _progress_total = 0;

  @state() private _progress_finished = 0;

  @state() private _progress_in_progress = 0;

  private _subscribed?: Promise<UnsubscribeFunc>;

  public showDialog(params: ZWaveJSHealNetworkDialogParams): void {
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

  protected render(): TemplateResult {
    if (!this.entry_id) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.zwave_js.heal_network.title")
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
                      "ui.panel.config.zwave_js.heal_network.introduction"
                    )}
                  </p>
                </div>
              </div>
              <p>
                <em>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.heal_network.traffic_warning"
                  )}
                </em>
              </p>
              <mwc-button slot="primaryAction" @click=${this._startHeal}>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.heal_network.start_heal"
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
                      "ui.panel.config.zwave_js.heal_network.in_progress"
                    )}
                  </b>
                </p>
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.heal_network.run_in_background"
                  )}
                </p>
              </div>
              ${!this._progress_total
                ? html`
                    <mwc-linear-progress indeterminate> </mwc-linear-progress>
                  `
                : ""}
              <mwc-button slot="secondaryAction" @click=${this._stopHeal}>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.heal_network.stop_heal"
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
                      "ui.panel.config.zwave_js.heal_network.healing_failed"
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
                      "ui.panel.config.zwave_js.heal_network.healing_complete"
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
                      "ui.panel.config.zwave_js.heal_network.healing_cancelled"
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
    if (network.controller.is_heal_network_active) {
      this._status = "started";
      this._subscribed = subscribeHealZwaveNetworkProgress(
        this.hass,
        this.entry_id!,
        this._handleMessage.bind(this)
      );
    }
  }

  private _startHeal(): void {
    if (!this.hass) {
      return;
    }
    healZwaveNetwork(this.hass, this.entry_id!);
    this._status = "started";
    this._subscribed = subscribeHealZwaveNetworkProgress(
      this.hass,
      this.entry_id!,
      this._handleMessage.bind(this)
    );
  }

  private _stopHeal(): void {
    if (!this.hass) {
      return;
    }
    stopHealZwaveNetwork(this.hass, this.entry_id!);
    this._unsubscribe();
    this._status = "cancelled";
  }

  private _handleMessage(message: ZWaveJSHealNetworkStatusMessage): void {
    if (message.event === "heal network progress") {
      let finished = 0;
      let in_progress = 0;
      for (const status of Object.values(message.heal_node_status)) {
        if (status === "pending") {
          in_progress++;
        }
        if (["skipped", "failed", "done"].includes(status)) {
          finished++;
        }
      }
      this._progress_total = Object.keys(message.heal_node_status).length;
      this._progress_finished = finished / this._progress_total;
      this._progress_in_progress = in_progress / this._progress_total;
    }
    if (message.event === "heal network done") {
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
    "dialog-zwave_js-heal-network": DialogZWaveJSHealNetwork;
  }
}
