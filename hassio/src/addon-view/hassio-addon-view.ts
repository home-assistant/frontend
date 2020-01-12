import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-spinner/paper-spinner-lite";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

import { HomeAssistant, Route } from "../../../src/types";
import {
  HassioAddonDetails,
  fetchHassioAddonInfo,
} from "../../../src/data/hassio";
import { hassioStyle } from "../resources/hassio-style";
import { haStyle } from "../../../src/resources/styles";

import "./hassio-addon-audio";
import "./hassio-addon-config";
import "./hassio-addon-info";
import "./hassio-addon-logs";
import "./hassio-addon-network";

@customElement("hassio-addon-view")
class HassioAddonView extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public route!: Route;
  @property() public addon?: HassioAddonDetails;

  protected render(): TemplateResult | void {
    if (!this.addon) {
      return html`
        <paper-spinner-lite active></paper-spinner-lite>
      `;
    }
    return html`
      <hass-subpage header="Hass.io: add-on details" hassio>
        <div class="content">
          <hassio-addon-info
            .hass=${this.hass}
            .addon=${this.addon}
          ></hassio-addon-info>

          ${this.addon && this.addon.version
            ? html`
                <hassio-addon-config
                  .hass=${this.hass}
                  .addon=${this.addon}
                ></hassio-addon-config>

                ${this.addon.audio
                  ? html`
                      <hassio-addon-audio
                        .hass=${this.hass}
                        .addon=${this.addon}
                      ></hassio-addon-audio>
                    `
                  : ""}
                ${this.addon.network
                  ? html`
                      <hassio-addon-network
                        .hass=${this.hass}
                        .addon=${this.addon}
                      ></hassio-addon-network>
                    `
                  : ""}

                <hassio-addon-logs
                  .hass=${this.hass}
                  .addon=${this.addon}
                ></hassio-addon-logs>
              `
            : ""}
        </div>
      </hass-subpage>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      css`
        :host {
          color: var(--primary-text-color);
          --paper-card-header-color: var(--primary-text-color);
        }
        .content {
          padding: 24px 0 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        hassio-addon-info,
        hassio-addon-network,
        hassio-addon-audio,
        hassio-addon-config {
          margin-bottom: 24px;
          width: 600px;
        }
        hassio-addon-logs {
          max-width: calc(100% - 8px);
          min-width: 600px;
        }
        @media only screen and (max-width: 600px) {
          hassio-addon-info,
          hassio-addon-network,
          hassio-addon-audio,
          hassio-addon-config,
          hassio-addon-logs {
            max-width: 100%;
            min-width: 100%;
          }
        }
      `,
    ];
  }

  protected async firstUpdated(): Promise<void> {
    await this._routeDataChanged(this.route);
    this.addEventListener("hass-api-called", (ev) => this._apiCalled(ev));
  }

  private async _apiCalled(ev): Promise<void> {
    const path: string = ev.detail.path;

    if (!path) {
      return;
    }

    if (path === "uninstall") {
      history.back();
    } else {
      await this._routeDataChanged(this.route);
    }
  }

  private async _routeDataChanged(routeData: Route): Promise<void> {
    const addon = routeData.path.substr(1);
    try {
      const addoninfo = await fetchHassioAddonInfo(this.hass, addon);
      this.addon = addoninfo;
    } catch {
      this.addon = undefined;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-view": HassioAddonView;
  }
}
