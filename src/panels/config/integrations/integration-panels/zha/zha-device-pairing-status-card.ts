import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../../../../components/ha-card";
import {
  CONFIGURED,
  INCOMPLETE_PAIRING_STATUSES,
  INITIALIZED,
  INTERVIEW_COMPLETE,
  ZHADevice,
} from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { formatAsPaddedHex } from "./functions";
import "./zha-device-card";

@customElement("zha-device-pairing-status-card")
class ZHADevicePairingStatusCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device?: ZHADevice;

  @property({ type: Boolean }) public narrow?: boolean;

  @state() private _showHelp = false;

  protected render() {
    if (!this.hass || !this.device) {
      return nothing;
    }

    return html`
      <ha-card
        outlined
        class="discovered ${classMap({
          initialized: this.device.pairing_status === INITIALIZED,
        })}"
        ><div class="header">
          <h4>
            ${this.hass!.localize(
              `ui.panel.config.zha.device_pairing_card.${this.device.pairing_status}`
            )}
          </h4>
          <h1>
            ${this.hass!.localize(
              `ui.panel.config.zha.device_pairing_card.${this.device.pairing_status}_status_text`
            )}
          </h1>
        </div>
        <div class="card-content">
          ${[INTERVIEW_COMPLETE, CONFIGURED].includes(
            this.device.pairing_status!
          )
            ? html`
                <div class="model">${this.device.model}</div>
                <div class="manuf">
                  ${this.hass.localize(
                    "ui.dialogs.zha_device_info.manuf",
                    "manufacturer",
                    this.device.manufacturer
                  )}
                </div>
              `
            : nothing}
          <div class="info">
            ${INCOMPLETE_PAIRING_STATUSES.includes(this.device.pairing_status!)
              ? html`
                  <div class="text">IEEE: ${this.device.ieee}</div>
                  <div class="text">
                    NWK: ${formatAsPaddedHex(this.device.nwk)}
                  </div>
                `
              : nothing}
          </div>
          ${this.device.pairing_status === INITIALIZED
            ? html`
                <zha-device-card
                  class="card"
                  .hass=${this.hass}
                  .device=${this.device}
                  .narrow=${this.narrow}
                  .showHelp=${this._showHelp}
                ></zha-device-card>
              `
            : nothing}
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .discovered {
          --ha-card-border-color: var(--primary-color);
        }
        .discovered.initialized {
          --ha-card-border-color: var(--success-color);
        }
        .discovered .header {
          background: var(--primary-color);
          color: var(--text-primary-color);
          padding: 8px;
          text-align: center;
          margin-bottom: 20px;
          /* Padding is subtracted for nested elements with border radiuses */
          border-top-left-radius: calc(
            var(--ha-card-border-radius, 12px) - 2px
          );
          border-top-right-radius: calc(
            var(--ha-card-border-radius, 12px) - 2px
          );
        }
        .discovered.initialized .header {
          background: var(--success-color);
        }
        h1 {
          margin: 0;
        }
        h4 {
          margin: 0;
        }
        .text,
        .manuf,
        .model {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-device-pairing-status-card": ZHADevicePairingStatusCard;
  }
}
