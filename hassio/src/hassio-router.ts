import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { HassioPanelInfo } from "../../src/data/hassio/supervisor";
import { Supervisor } from "../../src/data/supervisor/supervisor";
import {
  HassRouterPage,
  RouterOptions,
} from "../../src/layouts/hass-router-page";
import { HomeAssistant } from "../../src/types";
// Don't codesplit it, that way the dashboard always loads fast.
import "./hassio-panel";

@customElement("hassio-router")
class HassioRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) public panel!: HassioPanelInfo;

  @property({ type: Boolean }) public narrow!: boolean;

  protected routerOptions: RouterOptions = {
    // Hass.io has a page with tabs, so we route all non-matching routes to it.
    defaultPage: "dashboard",
    beforeRender: (page: string) => {
      if (page === "snapshots") {
        return "backups";
      }
      if (page === "dashboard" && this.panel.config?.ingress) {
        return "ingress";
      }
      return undefined;
    },
    showLoading: true,
    routes: {
      dashboard: {
        tag: "hassio-panel",
        cache: true,
      },
      backups: "dashboard",
      store: "dashboard",
      system: "dashboard",
      "update-available": {
        tag: "update-available-dashboard",
        load: () => import("./update-available/update-available-dashboard"),
      },
      addon: {
        tag: "hassio-addon-dashboard",
        load: () => import("./addon-view/hassio-addon-dashboard"),
      },
      ingress: {
        tag: "hassio-ingress-view",
        load: () => import("./ingress-view/hassio-ingress-view"),
      },
      _my_redirect: {
        tag: "hassio-my-redirect",
        load: () => import("./hassio-my-redirect"),
      },
    },
  };

  protected updatePageEl(el) {
    // the tabs page does its own routing so needs full route.
    const hassioPanel = el.localName === "hassio-panel";
    const ingressPanel = el.localName === "hassio-ingress-view";
    const route = hassioPanel
      ? this.route
      : ingressPanel && this.panel.config?.ingress
      ? this._ingressRoute(this.panel.config?.ingress)
      : this.routeTail;

    el.hass = this.hass;
    el.narrow = this.narrow;
    el.route = route;
    el.supervisor = this.supervisor;

    if (ingressPanel) {
      el.ingressPanel = Boolean(this.panel.config?.ingress);
    }
  }

  private _ingressRoute = memoizeOne((ingress: string) => ({
    prefix: "/hassio/ingress",
    path: `/${ingress}`,
  }));
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-router": HassioRouter;
  }
}
