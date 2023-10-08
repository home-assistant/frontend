import "@material/mwc-button/mwc-button";
import { mdiCheckCircle, mdiCloseCircle, mdiStethoscope } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import {
  computeDeviceName,
  DeviceRegistryEntry,
} from "../../../../../data/device_registry";
import {
  fetchZwaveNetworkStatus,
  rebuildZwaveNodeRoutes,
  ZWaveJSNetwork,
} from "../../../../../data/zwave_js";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ZWaveJSRebuildNodeRoutesDialogParams } from "./show-dialog-zwave_js-rebuild-node-routes";

@customElement("dialog-zwave_js-rebuild-node-routes")
class DialogZWaveJSRebuildNodeRoutes extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private device?: DeviceRegistryEntry;

  @state() private _status?: string;

  @state() private _error?: string;

  public showDialog(params: ZWaveJSRebuildNodeRoutesDialogParams): void {
    this.device = params.device;
    this._fetchData();
  }

  public closeDialog(): void {
    this._status = undefined;
    this.device = undefined;
    this._error = undefined;

    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this.device) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(
            "ui.panel.config.zwave_js.rebuild_node_routes.title"
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
                      "ui.panel.config.zwave_js.rebuild_node_routes.introduction",
                      {
                        device: html`<em
                          >${computeDeviceName(this.device, this.hass!)}</em
                        >`,
                      }
                    )}
                  </p>
                </div>
              </div>
              <p>
                <em>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.rebuild_node_routes.traffic_warning"
                  )}
                </em>
              </p>
              <mwc-button
                slot="primaryAction"
                @click=${this._startRebuildingRoutes}
              >
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.rebuild_node_routes.start_rebuilding_routes"
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
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.rebuild_node_routes.in_progress",
                      {
                        device: html`<em
                          >${computeDeviceName(this.device, this.hass!)}</em
                        >`,
                      }
                    )}
                  </p>
                </div>
              </div>
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
                      "ui.panel.config.zwave_js.rebuild_node_routes.rebuilding_routes_failed",
                      {
                        device: html`<em
                          >${computeDeviceName(this.device, this.hass!)}</em
                        >`,
                      }
                    )}
                  </p>
                  <p>
                    ${this._error
                      ? html` <em>${this._error}</em> `
                      : `
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.rebuild_node_routes.rebuilding_routes_failed_check_logs"
                  )}
                  `}
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
                      "ui.panel.config.zwave_js.rebuild_node_routes.rebuilding_routes_complete",
                      {
                        device: html`<em
                          >${computeDeviceName(this.device, this.hass!)}</em
                        >`,
                      }
                    )}
                  </p>
                </div>
              </div>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.common.close")}
              </mwc-button>
            `
          : ``}
        ${this._status === "rebuilding-routes"
          ? html`
              <div class="flex-container">
                <ha-svg-icon
                  .path=${mdiCloseCircle}
                  class="failed"
                ></ha-svg-icon>
                <div class="status">
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.rebuild_node_routes.routes_rebuild_in_progress"
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

  private async _fetchData(): Promise<void> {
    if (!this.hass) {
      return;
    }
    const network: ZWaveJSNetwork = await fetchZwaveNetworkStatus(this.hass!, {
      device_id: this.device!.id,
    });
    if (network.controller.is_rebuilding_routes) {
      this._status = "rebuilding-routes";
    }
  }

  private async _startRebuildingRoutes(): Promise<void> {
    if (!this.hass) {
      return;
    }
    this._status = "started";
    try {
      this._status = (await rebuildZwaveNodeRoutes(this.hass, this.device!.id))
        ? "finished"
        : "failed";
    } catch (err: any) {
      this._error = err.message;
      this._status = "failed";
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

        .flex-container ha-svg-icon,
        .flex-container ha-circular-progress {
          margin-right: 20px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zwave_js-rebuild-node-routes": DialogZWaveJSRebuildNodeRoutes;
  }
}
