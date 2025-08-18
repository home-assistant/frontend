import { mdiCheckCircle, mdiCloseCircle, mdiStethoscope } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { computeDeviceNameDisplay } from "../../../../../common/entity/compute_device_name";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import "../../../../../components/ha-button";
import "../../../../../components/ha-spinner";
import type { DeviceRegistryEntry } from "../../../../../data/device_registry";
import type { ZWaveJSNetwork } from "../../../../../data/zwave_js";
import {
  fetchZwaveNetworkStatus,
  rebuildZwaveNodeRoutes,
} from "../../../../../data/zwave_js";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { ZWaveJSRebuildNodeRoutesDialogParams } from "./show-dialog-zwave_js-rebuild-node-routes";

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
                        device: html`<em>
                          ${computeDeviceNameDisplay(this.device, this.hass!)}
                        </em>`,
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
              <ha-button
                slot="primaryAction"
                @click=${this._startRebuildingRoutes}
              >
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.rebuild_node_routes.start_rebuilding_routes"
                )}
              </ha-button>
            `
          : ``}
        ${this._status === "started"
          ? html`
              <div class="flex-container">
                <ha-spinner></ha-spinner>
                <div class="status">
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.rebuild_node_routes.in_progress",
                      {
                        device: html`<em>
                          ${computeDeviceNameDisplay(this.device, this.hass!)}
                        </em>`,
                      }
                    )}
                  </p>
                </div>
              </div>
              <ha-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.common.close")}
              </ha-button>
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
                          >${computeDeviceNameDisplay(
                            this.device,
                            this.hass!
                          )}</em
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
              <ha-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.common.close")}
              </ha-button>
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
                        device: html`<em>
                          ${computeDeviceNameDisplay(this.device, this.hass!)}
                        </em>`,
                      }
                    )}
                  </p>
                </div>
              </div>
              <ha-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.common.close")}
              </ha-button>
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
              <ha-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.common.close")}
              </ha-button>
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
        .flex-container ha-spinner {
          margin-right: 20px;
          margin-inline-end: 20px;
          margin-inline-start: initial;
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
