import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-icon-button/paper-icon-button";
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
import { HassioAddonDetails } from "../../../src/data/hassio";
import { hassioStyle } from "../resources/hassio-style";

import "./hassio-addon-audio";
import "./hassio-addon-config";
import "./hassio-addon-info";
import "./hassio-addon-logs";
import "./hassio-addon-network";

@customElement("hassio-addon-view")
class HassioAddonView extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public route!: Route;
  @property() public addon!: HassioAddonDetails | null;

  protected render(): TemplateResult | void {
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

  protected firstUpdated() {
    this.routeDataChanged(this.route);
    this.addEventListener("hass-api-called", (ev) => this.apiCalled(ev));
  }

  apiCalled(ev): void {
    const path = ev.detail.path;

    if (!path) return;

    if (path.substr(path.lastIndexOf("/") + 1) === "uninstall") {
      history.back();
    } else {
      this.routeDataChanged(this.route);
    }
  }

  routeDataChanged(routeData): void {
    const addon = routeData.path.substr(1);
    this.hass.callApi("GET", `hassio/addons/${addon}/info`).then(
      (info) => {
        this.addon = (info as any).data;
      },
      () => {
        this.addon = null;
      }
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-view": HassioAddonView;
  }
}
