import {
  customElement,
  property,
  internalProperty,
  PropertyValues,
} from "lit-element";
import {
  fetchHassioHassOsInfo,
  fetchHassioHostInfo,
  HassioHassOSInfo,
  HassioHostInfo,
} from "../../src/data/hassio/host";
import {
  fetchHassioHomeAssistantInfo,
  fetchHassioSupervisorInfo,
  fetchHassioInfo,
  HassioHomeAssistantInfo,
  HassioInfo,
  HassioPanelInfo,
  HassioSupervisorInfo,
} from "../../src/data/hassio/supervisor";
import {
  HassRouterPage,
  RouterOptions,
} from "../../src/layouts/hass-router-page";
import "../../src/resources/ha-style";
import { HomeAssistant } from "../../src/types";
// Don't codesplit it, that way the dashboard always loads fast.
import "./hassio-panel";

@customElement("hassio-router")
class HassioRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public panel!: HassioPanelInfo;

  @property() public narrow!: boolean;

  protected routerOptions: RouterOptions = {
    // Hass.io has a page with tabs, so we route all non-matching routes to it.
    defaultPage: "dashboard",
    initialLoad: () => this._fetchData(),
    showLoading: true,
    routes: {
      dashboard: {
        tag: "hassio-panel",
        cache: true,
      },
      snapshots: "dashboard",
      store: "dashboard",
      system: "dashboard",
      addon: {
        tag: "hassio-addon-dashboard",
        load: () =>
          import(
            /* webpackChunkName: "hassio-addon-dashboard" */ "./addon-view/hassio-addon-dashboard"
          ),
      },
      ingress: {
        tag: "hassio-ingress-view",
        load: () =>
          import(
            /* webpackChunkName: "hassio-ingress-view" */ "./ingress-view/hassio-ingress-view"
          ),
      },
    },
  };

  @internalProperty() private _supervisorInfo?: HassioSupervisorInfo;

  @internalProperty() private _hostInfo: HassioHostInfo;

  @internalProperty() private _hassioInfo?: HassioInfo;

  @internalProperty() private _hassOsInfo?: HassioHassOSInfo;

  @internalProperty() private _hassInfo?: HassioHomeAssistantInfo;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.addEventListener("hass-api-called", (ev) => this._apiCalled(ev));
  }

  protected updatePageEl(el) {
    // the tabs page does its own routing so needs full route.
    const route = el.nodeName === "HASSIO-PANEL" ? this.route : this.routeTail;

    el.hass = this.hass;
    el.narrow = this.narrow;
    el.supervisorInfo = this._supervisorInfo;
    el.hassioInfo = this._hassioInfo;
    el.hostInfo = this._hostInfo;
    el.hassInfo = this._hassInfo;
    el.hassOsInfo = this._hassOsInfo;
    el.route = route;

    if (el.localName === "hassio-ingress-view") {
      el.ingressPanel = this.panel.config && this.panel.config.ingress;
    }
  }

  private async _fetchData() {
    if (this.panel.config && this.panel.config.ingress) {
      this._redirectIngress(this.panel.config.ingress);
      return;
    }

    const [supervisorInfo, hostInfo, hassInfo, hassioInfo] = await Promise.all([
      fetchHassioSupervisorInfo(this.hass),
      fetchHassioHostInfo(this.hass),
      fetchHassioHomeAssistantInfo(this.hass),
      fetchHassioInfo(this.hass),
    ]);
    this._supervisorInfo = supervisorInfo;
    this._hassioInfo = hassioInfo;
    this._hostInfo = hostInfo;
    this._hassInfo = hassInfo;

    if (this._hostInfo.features && this._hostInfo.features.includes("hassos")) {
      this._hassOsInfo = await fetchHassioHassOsInfo(this.hass);
    }
  }

  private _redirectIngress(addonSlug: string) {
    this.route = { prefix: "/hassio", path: `/ingress/${addonSlug}` };
  }

  private _apiCalled(ev) {
    if (!ev.detail.success) {
      return;
    }

    let tries = 1;

    const tryUpdate = () => {
      this._fetchData().catch(() => {
        tries += 1;
        setTimeout(tryUpdate, Math.min(tries, 5) * 1000);
      });
    };

    tryUpdate();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-router": HassioRouter;
  }
}
