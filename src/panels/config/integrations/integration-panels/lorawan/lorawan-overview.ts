import {
  mdiCheck,
  mdiDevices,
  mdiPlus,
  mdiLanConnect,
  mdiCloseCircleOutline,
  mdiVectorPolyline,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/item/ha-list-item-button";
import "../../../../../components/list/ha-list-nav";
import type { LoRaWANDevices } from "../../../../../data/lorawan";
import { subscribeLoRaWANDevices } from "../../../../../data/lorawan";
import "../../../../../layouts/hass-subpage";
import { panelIsReady } from "../../../../../layouts/panel-ready";
import { haLora } from "../../../../../resources/ha-icons";
import type { HomeAssistant } from "../../../../../types";

@customElement("lorawan-overview")
export class LoRaWANOverview extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Boolean }) public narrow = false;
  @state() private _snapshot?: LoRaWANDevices;
  @state() private _error = false;
  private _unsubscribe?: Promise<UnsubscribeFunc>;

  protected firstUpdated() {
    this._subscribe();
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) this._subscribe();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribe?.then((unsubscribe) => unsubscribe());
  }

  private _subscribe() {
    this._error = false;
    this._unsubscribe = subscribeLoRaWANDevices(
      this.hass.connection,
      (snapshot) => {
        this._snapshot = snapshot;
        panelIsReady(this);
      }
    ).catch(() => {
      this._error = true;
      panelIsReady(this);
      return () => undefined;
    });
  }

  protected render() {
    const snapshot = this._snapshot;
    const connected = !!snapshot?.connections.length;
    return html`<hass-subpage
      .hass=${this.hass}
      .narrow=${this.narrow}
      .header=${this.hass.localize("ui.panel.config.lorawan.title")}
      back-path="/config/connectivity"
      has-fab
    >
      <ha-button
        slot="fab"
        size="l"
        @click=${this._addDevice}
        .disabled=${!snapshot?.connections.length}
      >
        <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
        ${this.hass.localize("ui.panel.config.lorawan.add_device")}
      </ha-button>
      <div class="container">
        ${this._error ? html`<ha-alert alert-type="error">${this.hass.localize("ui.panel.config.lorawan.overview.load_error")}<ha-button slot="action" appearance="plain" @click=${this._subscribe}>${this.hass.localize("ui.common.retry")}</ha-button></ha-alert>` : nothing}
        ${!snapshot && !this._error ? html`<ha-spinner></ha-spinner>` : nothing}
        ${
          snapshot
            ? html`
                <ha-card class="summary">
                  <div class="summary-content">
                    <div
                      class="status-icon ${connected ? "connected" : "unavailable"}"
                    >
                      <ha-svg-icon
                        .path=${connected ? mdiCheck : mdiCloseCircleOutline}
                      ></ha-svg-icon>
                    </div>
                    <div>
                      <h2>
                        ${this.hass.localize("ui.panel.config.lorawan.overview.total_connections", { count: snapshot.connections.length })}
                      </h2>
                      <p>
                        ${this.hass.localize("ui.panel.config.lorawan.overview.devices_count", { count: snapshot.devices.length })}
                      </p>
                    </div>
                    <ha-svg-icon
                      class="logo"
                      .path=${haLora}
                      .viewBox=${"0 0 250 166"}
                    ></ha-svg-icon>
                  </div>
                </ha-card>
                <ha-card>
                  <div class="card-heading">
                    <h2>
                      ${this.hass.localize("ui.panel.config.lorawan.overview.network")}
                    </h2>
                    <ha-button
                      appearance="filled"
                      href="/config/lorawan/topology"
                      ><ha-svg-icon
                        slot="start"
                        .path=${mdiVectorPolyline}
                      ></ha-svg-icon
                      >${this.hass.localize("ui.panel.config.lorawan.overview.show_map")}</ha-button
                    >
                  </div>
                  <ha-list-nav
                    .ariaLabel=${this.hass.localize("ui.panel.config.lorawan.overview.network")}
                  >
                    <ha-list-item-button
                      href="/config/lorawan/devices?group=connection"
                      ><ha-svg-icon
                        slot="start"
                        .path=${mdiDevices}
                      ></ha-svg-icon>
                      <div slot="headline">
                        ${this.hass.localize("ui.panel.config.lorawan.overview.devices_count", { count: snapshot.devices.length })}
                      </div>
                      <ha-icon-next slot="end"></ha-icon-next
                    ></ha-list-item-button>
                    <ha-list-item-button href="/config/lorawan/connections">
                      <ha-svg-icon
                        slot="start"
                        .path=${mdiLanConnect}
                      ></ha-svg-icon>
                      <div slot="headline">
                        ${this.hass.localize("ui.panel.config.lorawan.overview.total_connections", { count: snapshot.connections.length })}
                      </div>
                      <ha-icon-next slot="end"></ha-icon-next>
                    </ha-list-item-button>
                  </ha-list-nav>
                </ha-card>
              `
            : nothing
        }
      </div>
    </hass-subpage>`;
  }

  private _addDevice() {
    fireEvent(this, "show-dialog", {
      dialogTag: "dialog-lorawan-add-device",
      dialogImport: () => import("./dialog-lorawan-add-device"),
      dialogParams: { connections: this._snapshot!.connections },
    });
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    .container {
      padding: var(--ha-space-2) var(--ha-space-4) var(--ha-space-4);
    }
    ha-card {
      overflow: hidden;
      margin: 0 auto var(--ha-space-4);
      max-width: 600px;
    }
    .summary {
      margin-top: var(--ha-space-6);
    }
    .summary-content {
      display: flex;
      align-items: center;
      gap: var(--ha-space-4);
      padding: var(--ha-space-4);
    }
    .summary h2 {
      font-size: var(--ha-font-size-xl);
      font-weight: var(--ha-font-weight-normal);
    }
    .status-icon {
      position: relative;
      border-radius: var(--ha-border-radius-2xl);
      width: var(--ha-space-10);
      height: var(--ha-space-10);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      --icon-color: var(--success-color);
    }
    .status-icon.unavailable {
      --icon-color: var(--error-color);
    }
    .status-icon::before {
      content: "";
      position: absolute;
      inset: 0;
      background-color: var(--icon-color);
      opacity: 0.2;
    }
    .status-icon ha-svg-icon {
      color: var(--icon-color);
    }
    .logo {
      --mdc-icon-size: 40px;
      margin-inline-start: auto;
      flex-shrink: 0;
    }
    h2 {
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-medium);
      margin: 0;
    }
    p {
      color: var(--secondary-text-color);
      margin: var(--ha-space-1) 0 0;
    }
    .card-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--ha-space-3);
      padding: var(--ha-space-4);
    }
    ha-spinner {
      display: block;
      margin: var(--ha-space-8) auto;
    }
    ha-alert {
      margin-bottom: var(--ha-space-4);
    }
    @media (max-width: 450px) {
      .container {
        padding: var(--ha-space-2) var(--ha-space-4) var(--ha-space-4);
      }
      .card-heading {
        flex-wrap: wrap;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "lorawan-overview": LoRaWANOverview;
  }
}
