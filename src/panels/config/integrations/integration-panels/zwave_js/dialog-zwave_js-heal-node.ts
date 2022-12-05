import "../../../../../components/ha-circular-progress";
import "@material/mwc-button/mwc-button";
import { mdiStethoscope, mdiCheckCircle, mdiCloseCircle } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import {
  DeviceRegistryEntry,
  computeDeviceName,
} from "../../../../../data/device_registry";
import {
  fetchZwaveNetworkStatus,
  healZwaveNode,
  ZWaveJSNetwork,
} from "../../../../../data/zwave_js";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ZWaveJSHealNodeDialogParams } from "./show-dialog-zwave_js-heal-node";

@customElement("dialog-zwave_js-heal-node")
class DialogZWaveJSHealNode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private device?: DeviceRegistryEntry;

  @state() private _status?: string;

  @state() private _error?: string;

  public showDialog(params: ZWaveJSHealNodeDialogParams): void {
    this.device = params.device;
    this._fetchData();
  }

  public closeDialog(): void {
    this._status = undefined;
    this.device = undefined;
    this._error = undefined;

    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this.device) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.zwave_js.heal_node.title")
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
                      "ui.panel.config.zwave_js.heal_node.introduction",
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
                    "ui.panel.config.zwave_js.heal_node.traffic_warning"
                  )}
                </em>
              </p>
              <mwc-button slot="primaryAction" @click=${this._startHeal}>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.heal_node.start_heal"
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
                      "ui.panel.config.zwave_js.heal_node.in_progress",
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
                      "ui.panel.config.zwave_js.heal_node.healing_failed",
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
                    "ui.panel.config.zwave_js.heal_node.healing_failed_check_logs"
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
                      "ui.panel.config.zwave_js.heal_node.healing_complete",
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
        ${this._status === "network-healing"
          ? html`
              <div class="flex-container">
                <ha-svg-icon
                  .path=${mdiCloseCircle}
                  class="failed"
                ></ha-svg-icon>
                <div class="status">
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.heal_node.network_heal_in_progress"
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
    if (network.controller.is_heal_network_active) {
      this._status = "network-healing";
    }
  }

  private async _startHeal(): Promise<void> {
    if (!this.hass) {
      return;
    }
    this._status = "started";
    try {
      this._status = (await healZwaveNode(this.hass, this.device!.id))
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
    "dialog-zwave_js-heal-node": DialogZWaveJSHealNode;
  }
}
