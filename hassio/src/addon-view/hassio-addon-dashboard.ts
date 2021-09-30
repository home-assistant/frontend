import {
  mdiCogs,
  mdiFileDocument,
  mdiInformationVariant,
  mdiMathLog,
} from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../src/common/dom/fire_event";
import { navigate } from "../../../src/common/navigate";
import { extractSearchParam } from "../../../src/common/url/search-params";
import "../../../src/components/ha-circular-progress";
import {
  fetchHassioAddonInfo,
  fetchHassioAddonsInfo,
  HassioAddonDetails,
} from "../../../src/data/hassio/addon";
import { extractApiErrorMessage } from "../../../src/data/hassio/common";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import "../../../src/layouts/hass-error-screen";
import "../../../src/layouts/hass-loading-screen";
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

  @state() _error?: string;

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
    if (this._error) {
      return html`<hass-error-screen
        .error=${this._error}
      ></hass-error-screen>`;
    }

    if (!this.addon) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }

    const addonTabs: PageNavigation[] = [
      {
        translationKey: "addon.panel.info",
        path: `/hassio/addon/${this.addon.slug}/info`,
        iconPath: mdiInformationVariant,
      },
    ];

    if (this.addon.documentation) {
      addonTabs.push({
        translationKey: "addon.panel.documentation",
        path: `/hassio/addon/${this.addon.slug}/documentation`,
        iconPath: mdiFileDocument,
      });
    }

    if (this.addon.version) {
      addonTabs.push(
        {
          translationKey: "addon.panel.configuration",
          path: `/hassio/addon/${this.addon.slug}/config`,
          iconPath: mdiCogs,
        },
        {
          translationKey: "addon.panel.log",
          path: `/hassio/addon/${this.addon.slug}/logs`,
          iconPath: mdiMathLog,
        }
      );
    }

    const route = this._computeTail(this.route);

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .localizeFunc=${this.supervisor.localize}
        .narrow=${this.narrow}
        .backPath=${this.addon.version ? "/hassio/dashboard" : "/hassio/store"}
        .route=${route}
        .tabs=${addonTabs}
        supervisor
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

  static get styles(): CSSResultGroup {
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
    if (this.route.path === "") {
      const requestedAddon = extractSearchParam("addon");
      if (requestedAddon) {
        const addonsInfo = await fetchHassioAddonsInfo(this.hass);
        const validAddon = addonsInfo.addons.some(
          (addon) => addon.slug === requestedAddon
        );
        if (!validAddon) {
          this._error = this.supervisor.localize("my.error_addon_not_found");
        } else {
          navigate(`/hassio/addon/${requestedAddon}`, { replace: true });
        }
      }
    }
    this.addEventListener("hass-api-called", (ev) => this._apiCalled(ev));
  }

  private async _apiCalled(ev): Promise<void> {
    if (!ev.detail.success) {
      return;
    }

    const pathSplit: string[] = ev.detail.path?.split("/");

    if (!pathSplit || pathSplit.length === 0) {
      return;
    }

    const path: string = pathSplit[pathSplit.length - 1];

    if (["uninstall", "install", "update", "start", "stop"].includes(path)) {
      fireEvent(this, "supervisor-collection-refresh", {
        collection: "supervisor",
      });
    }

    if (path === "uninstall") {
      window.history.back();
    } else {
      await this._routeDataChanged();
    }
  }

  protected updated(changedProperties) {
    if (changedProperties.has("route") && !this.addon) {
      this._routeDataChanged();
    }
  }

  private async _routeDataChanged(): Promise<void> {
    const addon = this.route.path.split("/")[1];
    if (!addon) {
      return;
    }
    try {
      const addoninfo = await fetchHassioAddonInfo(this.hass, addon);
      this.addon = addoninfo;
    } catch (err: any) {
      this._error = `Error fetching addon info: ${extractApiErrorMessage(err)}`;
      this.addon = undefined;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-dashboard": HassioAddonDashboard;
  }
}
