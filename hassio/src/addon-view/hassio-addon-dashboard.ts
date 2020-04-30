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
import {
  fetchHassioAddonInfo,
  HassioAddonDetails,
} from "../../../src/data/hassio/addon";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant, Route } from "../../../src/types";
import { hassioStyle } from "../resources/hassio-style";
import "./hassio-addon-audio";
import "./hassio-addon-config";
import "./hassio-addon-info";
import "./hassio-addon-logs";
import "./hassio-addon-network";
import "../../../src/layouts/hass-subpage";

@customElement("hassio-addon-dashboard")
class HassioAddonDashboard extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public route!: Route;

  @property() public addon?: HassioAddonDetails;
  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  private _computeTail = memoizeOne((route: Route) => {
    const dividerPos = route.path.indexOf("/", 1);
    return dividerPos === -1
      ? {
          prefix: route.prefix + route.path,
          path: "",
        }
      : {
          prefix: route.prefix + route.path.substr(0, dividerPos),
          path: route.path.substr(dividerPos),
        };
  });

  protected render(): TemplateResult {
    if (!this.addon) {
      return html` <paper-spinner-lite active></paper-spinner-lite> `;
    }

    const addonTabs: PageNavigation[] = [
      {
        name: "Info",
        path: `/hassio/addon/${this.addon.slug}/info`,
        icon: "mdi:information-variant",
      },
    ];

    if (this.addon.version) {
      addonTabs.push(
        {
          name: "Configuration",
          path: `/hassio/addon/${this.addon.slug}/config`,
          icon: "mdi:cogs",
        },
        {
          name: "Log",
          path: `/hassio/addon/${this.addon.slug}/logs`,
          icon: "mdi:math-log",
        }
      );
    }

    const route = this._computeTail(this.route);

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .backPath=${this.addon.version ? "/hassio/dashboard" : "/hassio/store"}
        .route=${route}
        .hassio=${true}
        .tabs=${addonTabs}
      >
        <span slot="header">${this.addon.name}</span>
        <hassio-addon-router
          .route=${route}
          .narrow=${this.narrow}
          .hass=${this.hass}
          .addon=${this.addon}
        ></hassio-addon-router>
      </hass-tabs-subpage>
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
    const addon = routeData.path.split("/")[1];
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
    "hassio-addon-dashboard": HassioAddonDashboard;
  }
}
