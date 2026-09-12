import { mdiCheck, mdiCloseCircleOutline } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-svg-icon";
import { UNAVAILABLE } from "../../../../../data/entity/entity";
import { FALLBACK_DOMAIN_ICONS } from "../../../../../data/icons";
import type { RadioFrequencyTransmitter } from "../../../../../data/radio_frequency";
import { DOMAIN } from "../../../../../data/radio_frequency";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";

@customElement("radio-frequency-config-dashboard")
export class RadioFrequencyConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false })
  public transmitters: RadioFrequencyTransmitter[] = [];

  protected render(): TemplateResult {
    const total = this.transmitters.length;
    const online = this.transmitters.filter((transmitter) => {
      const stateObj = this.hass.states[transmitter.entity_id];
      return stateObj && stateObj.state !== UNAVAILABLE;
    }).length;
    const isOffline = online === 0;
    const status = isOffline ? "offline" : "online";
    const statusIcon = isOffline ? mdiCloseCircleOutline : mdiCheck;

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.radio_frequency.title")}
        back-path="/config/connectivity"
      >
        <div class="container">
          <ha-card class="network-status">
            <div class="card-content">
              <div class="heading">
                <div class="icon ${status}">
                  <ha-svg-icon .path=${statusIcon}></ha-svg-icon>
                </div>
                <div class="details">
                  ${this.hass.localize(
                    `ui.panel.config.radio_frequency.status_${status}`
                  )}<br />
                  <small>
                    ${this.hass.localize(
                      "ui.panel.config.radio_frequency.devices_online_summary",
                      { online, total }
                    )}
                  </small>
                </div>
                <ha-svg-icon
                  class="logo"
                  .path=${FALLBACK_DOMAIN_ICONS[DOMAIN]}
                ></ha-svg-icon>
              </div>
            </div>
          </ha-card>

          <ha-card class="network-card">
            <div class="card-content">
              <ha-md-list>
                <ha-md-list-item
                  type="link"
                  href="/config/radio-frequency/devices"
                >
                  <ha-svg-icon
                    slot="start"
                    .path=${FALLBACK_DOMAIN_ICONS[DOMAIN]}
                  ></ha-svg-icon>
                  <div slot="headline">
                    ${this.hass.localize(
                      "ui.panel.config.radio_frequency.devices_count",
                      { count: total }
                    )}
                  </div>
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-list-item>
              </ha-md-list>
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          padding: var(--ha-space-2) var(--ha-space-4) var(--ha-space-4);
        }

        ha-card {
          margin: 0px auto var(--ha-space-4);
          max-width: 600px;
        }

        ha-md-list {
          background: none;
          padding: 0;
        }

        .network-card {
          overflow: hidden;
        }

        .network-card .card-content {
          padding: 0;
        }

        .network-status div.heading {
          display: flex;
          align-items: center;
          column-gap: var(--ha-space-4);
        }

        .network-status div.heading .logo {
          margin-inline-start: auto;
          --mdc-icon-size: 40px;
        }

        .network-status div.heading .icon {
          position: relative;
          border-radius: var(--ha-border-radius-2xl);
          width: var(--ha-space-10);
          height: var(--ha-space-10);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          --icon-color: var(--primary-color);
        }

        .network-status div.heading .icon.online {
          --icon-color: var(--success-color);
        }

        .network-status div.heading .icon.offline {
          --icon-color: var(--error-color);
        }

        .network-status div.heading .icon::before {
          display: block;
          content: "";
          position: absolute;
          inset: 0;
          background-color: var(--icon-color, var(--primary-color));
          opacity: 0.2;
        }

        .network-status div.heading .icon ha-svg-icon {
          color: var(--icon-color, var(--primary-color));
          width: var(--ha-space-6);
          height: var(--ha-space-6);
        }

        .network-status div.heading .details {
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          color: var(--primary-text-color);
        }

        .network-status small {
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          letter-spacing: 0.25px;
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "radio-frequency-config-dashboard": RadioFrequencyConfigDashboard;
  }
}
