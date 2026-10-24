import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-icon-next";
import "../../../../../components/item/ha-list-item-button";
import "../../../../../components/list/ha-list-base";
import type { LoRaWANDevices } from "../../../../../data/lorawan";
import { subscribeLoRaWANDevices } from "../../../../../data/lorawan";
import "../../../../../layouts/hass-subpage";
import { panelIsReady } from "../../../../../layouts/panel-ready";
import type { HomeAssistant } from "../../../../../types";
import { brandsUrl } from "../../../../../util/brands-url";

@customElement("lorawan-connections")
export class LoRaWANConnections extends LitElement {
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
    return html`<hass-subpage
      .hass=${this.hass}
      .narrow=${this.narrow}
      .header=${this.hass.localize("ui.panel.config.lorawan.overview.connections")}
      back-path="/config/lorawan"
    >
      <div class="container">
        ${this._error ? html`<ha-alert alert-type="error">${this.hass.localize("ui.panel.config.lorawan.overview.load_error")}<ha-button slot="action" appearance="plain" @click=${this._subscribe}>${this.hass.localize("ui.common.retry")}</ha-button></ha-alert>` : nothing}
        ${!snapshot && !this._error ? html`<ha-spinner></ha-spinner>` : nothing}
        ${
          snapshot
            ? snapshot.connections.length
              ? html`<ha-card
                  ><ha-list-base>
                    ${snapshot.connections.map(
                      (connection) =>
                        html`<ha-list-item-button
                          href=${`/config/lorawan/devices?connection=${connection.entry_id}`}
                        >
                          <img
                            slot="start"
                            alt=""
                            width="24"
                            height="24"
                            src=${brandsUrl({ domain: connection.domain, type: "icon", darkOptimized: this.hass.themes.darkMode }, this.hass.hassUrl())}
                          />
                          <div slot="headline">${connection.title}</div>
                          <div slot="supporting-text">
                            ${this.hass.localize("ui.panel.config.lorawan.overview.devices_count", { count: snapshot.devices.filter((device) => device.connection.entry_id === connection.entry_id).length })}
                          </div>
                          <ha-icon-next slot="end"></ha-icon-next>
                        </ha-list-item-button>`
                    )}
                  </ha-list-base></ha-card
                >`
              : html`<ha-alert alert-type="info"
                  >${this.hass.localize("ui.panel.config.lorawan.overview.no_connections")}</ha-alert
                >`
            : nothing
        }
      </div>
    </hass-subpage>`;
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    .container {
      padding: var(--ha-space-2) var(--ha-space-4) var(--ha-space-4);
    }
    ha-card,
    ha-alert {
      max-width: 600px;
      margin: var(--ha-space-6) auto var(--ha-space-4);
      overflow: hidden;
    }
    ha-spinner {
      display: block;
      margin: var(--ha-space-8) auto;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "lorawan-connections": LoRaWANConnections;
  }
}
