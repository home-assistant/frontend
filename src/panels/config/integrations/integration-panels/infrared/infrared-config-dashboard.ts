import { mdiRemote, mdiRemoteTv } from "@mdi/js";
import type {
  CSSResultGroup,
  PropertyValues,
  TemplateResult,
  nothing,
} from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/ha-relative-time";
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
import { computeStateName } from "../../../../../common/entity/compute_state_name";

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

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.infrared.title")}
        back-path="/config"
      >
        <div class="container">
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
    const entityState = this.hass.states[proxy.entity_id];
    const entity = this.hass.entities[proxy.entity_id];
    const device = proxy.device_id
      ? this.hass.devices[proxy.device_id]
      : undefined;
    if (!device) {
      return html`
        <ha-md-list-item>
          <ha-svg-icon slot="start" .path=${icon}></ha-svg-icon>
          <div slot="headline">${computeStateName(entityState)}</div>
        </ha-md-list-item>
      `;
    }

    const name = computeDeviceName(device) || computeStateName(entityState);
    const areaId = entity.area_id || device.area_id;
    const area = areaId ? this.hass.areas[areaId] : undefined;

    const secondary = area ? area.name : "";

    return html`
      <ha-md-list-item
        type="link"
        href="/config/devices/device/${proxy.device_id}"
      >
        <ha-svg-icon slot="start" .path=${icon}></ha-svg-icon>
        <div slot="headline">${name}</div>
        <div slot="supporting-text">${secondary}</div>
        <div slot="end">
          ${this.hass.localize("ui.panel.config.infrared.last_used")}:
          <br />
          ${entityState.state === "unavailable" ||
          entityState.state === "unknown"
            ? this.hass.localize(`state.default.${entityState.state}`)
            : html`
                <ha-relative-time
                  .hass=${this.hass}
                  .datetime=${entityState.state}
                ></ha-relative-time>
              `}
        </div>
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
