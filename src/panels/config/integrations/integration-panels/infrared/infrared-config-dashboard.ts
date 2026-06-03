import {
  mdiCheck,
  mdiCloseCircleOutline,
  mdiRemote,
  mdiRemoteTv,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-svg-icon";
import type { InfraredProxy } from "../../../../../data/infrared";
import { listInfraredProxies } from "../../../../../data/infrared";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { computeDeviceName } from "../../../../../common/entity/compute_device_name";

@customElement("infrared-config-dashboard")
export class InfraredConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _proxies: InfraredProxy[] = [];

  public firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._fetchProxies();
  }

  private async _fetchProxies(): Promise<void> {
    const { proxies } = await listInfraredProxies(this.hass);
    this._proxies = proxies;
  }

  protected render(): TemplateResult {
    const emitters = this._proxies.filter((p) => p.type === "emitter");
    const receivers = this._proxies.filter((p) => p.type === "receiver");

    const isOffline = this._proxies.length === 0;
    const status = isOffline ? "offline" : "online";
    const statusIcon = isOffline ? mdiCloseCircleOutline : mdiCheck;

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.infrared.title")}
        back-path="/config"
      >
        <div class="container">
          <ha-card class="content network-status">
            <div class="card-content">
              <div class="heading">
                <div class="icon ${status}">
                  <ha-svg-icon .path=${statusIcon}></ha-svg-icon>
                </div>
                <div class="details">
                  ${this.hass.localize(
                    `ui.panel.config.infrared.status_${status}`
                  )}<br />
                  <small>
                    ${this.hass.localize(
                      "ui.panel.config.infrared.proxies_summary",
                      {
                        emitters: emitters.length,
                        receivers: receivers.length,
                      }
                    )}
                  </small>
                </div>
                <ha-svg-icon class="logo" .path=${mdiRemote}></ha-svg-icon>
              </div>
            </div>
          </ha-card>

          <ha-card class="network-card">
            <div class="card-header">
              ${this.hass.localize("ui.panel.config.infrared.proxies")}
            </div>
            <div class="card-content network-card-content">
              <div class="subheader">
                ${this.hass.localize("ui.panel.config.infrared.emitters")}
              </div>
              <ha-md-list>
                ${emitters.length === 0
                  ? html`<div class="no-proxies">
                      ${this.hass.localize(
                        "ui.panel.config.infrared.no_proxies"
                      )}
                    </div>`
                  : emitters.map((entity) =>
                      this._renderProxy(mdiRemote, entity)
                    )}
              </ha-md-list>

              <div class="subheader">
                ${this.hass.localize("ui.panel.config.infrared.receivers")}
              </div>
              <ha-md-list>
                ${emitters.length === 0
                  ? html`<div class="no-proxies">
                      ${this.hass.localize(
                        "ui.panel.config.infrared.no_proxies"
                      )}
                    </div>`
                  : receivers.map((entity) =>
                      this._renderProxy(mdiRemoteTv, entity)
                    )}
              </ha-md-list>
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private _renderProxy(
    icon: string,
    proxy: InfraredProxy
  ): TemplateResult | typeof nothing {
    const device = proxy.device_id
      ? this.hass.devices[proxy.device_id]
      : undefined;
    if (!device) {
      return html`
        <ha-md-list-item>
          <ha-svg-icon slot="start" .path=${icon}></ha-svg-icon>
          <div slot="headline">${proxy.name}</div>
        </ha-md-list-item>
      `;
    }

    const deviceName = computeDeviceName(device);
    const areaName =
      device && device.area_id
        ? this.hass.areas[device.area_id]?.name
        : undefined;

    let secondary: string;
    if (deviceName && areaName) {
      secondary = this.hass.localize(
        "ui.panel.config.infrared.device_in_area",
        { device: deviceName, area: areaName }
      );
    } else {
      secondary = deviceName || areaName || "";
    }

    return html`
      <ha-md-list-item
        type="link"
        href="/config/devices/device/${proxy.device_id}"
      >
        <ha-svg-icon slot="start" .path=${icon}></ha-svg-icon>
        <div slot="headline">${proxy.name}</div>
        <div slot="supporting-text">${secondary}</div>
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-md-list-item>
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

        .content {
          margin-top: var(--ha-space-6);
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

        .network-card .card-header {
          padding-bottom: var(--ha-space-2);
        }

        .subheader {
          padding: var(--ha-space-2) var(--ha-space-4);
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-medium);
          color: var(--secondary-text-color);
        }

        .no-proxies {
          padding: var(--ha-space-4);
          color: var(--secondary-text-color);
        }

        .network-status div.heading {
          display: flex;
          align-items: center;
          column-gap: var(--ha-space-4);
        }

        .network-status div.heading .logo {
          height: 40px;
          width: 40px;
          margin-inline-start: auto;
          color: var(--secondary-text-color);
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
    "infrared-config-dashboard": InfraredConfigDashboard;
  }
}
