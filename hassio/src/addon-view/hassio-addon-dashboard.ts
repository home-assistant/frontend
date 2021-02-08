import {
  mdiCogs,
  mdiFileDocument,
  mdiInformationVariant,
  mdiMathLog,
} from "@mdi/js";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import "../../../src/components/ha-circular-progress";
import {
  fetchHassioAddonInfo,
  HassioAddonDetails,
} from "../../../src/data/hassio/addon";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import "../../../src/layouts/hass-tabs-subpage";
import type { PageNavigation } from "../../../src/layouts/hass-tabs-subpage";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant, Route } from "../../../src/types";
import { hassioStyle } from "../resources/hassio-style";
import "./config/hassio-addon-audio";
import "./config/hassio-addon-config";
import "./config/hassio-addon-network";
import "./hassio-addon-router";
import "./info/hassio-addon-info";
import "./log/hassio-addon-logs";

@customElement("hassio-addon-dashboard")
class HassioAddonDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public addon?: HassioAddonDetails;

  @property({ type: Boolean }) public narrow!: boolean;

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
      return html`<ha-circular-progress active></ha-circular-progress>`;
    }

    const addonTabs: PageNavigation[] = [
      {
        name: "Info",
        path: `/hassio/addon/${this.addon.slug}/info`,
        iconPath: mdiInformationVariant,
      },
    ];

    if (this.addon.documentation) {
      addonTabs.push({
        name: "Documentation",
        path: `/hassio/addon/${this.addon.slug}/documentation`,
        iconPath: mdiFileDocument,
      });
    }

    if (this.addon.version) {
      addonTabs.push(
        {
          name: "Configuration",
          path: `/hassio/addon/${this.addon.slug}/config`,
          iconPath: mdiCogs,
        },
        {
          name: "Log",
          path: `/hassio/addon/${this.addon.slug}/logs`,
          iconPath: mdiMathLog,
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
        hassio
        .tabs=${addonTabs}
      >
        <span slot="header">${this.addon.name}</span>
        <hassio-addon-router
          .route=${route}
          .narrow=${this.narrow}
          .hass=${this.hass}
          .supervisor=${this.supervisor}
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
