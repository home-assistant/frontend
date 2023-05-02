import { customElement, property } from "lit/decorators";
import { Supervisor } from "../../src/data/supervisor/supervisor";
import {
  HassRouterPage,
  RouterOptions,
} from "../../src/layouts/hass-router-page";
import { HomeAssistant, Route } from "../../src/types";
// Don't codesplit it, that way the dashboard always loads fast.
import "./dashboard/hassio-dashboard";

@customElement("hassio-panel-router")
class HassioPanelRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  protected routerOptions: RouterOptions = {
    beforeRender: (page: string) =>
      page === "snapshots" ? "backups" : undefined,
    routes: {
      dashboard: {
        tag: "hassio-dashboard",
      },
      store: {
        tag: "hassio-addon-store",
        load: () => import("./addon-store/hassio-addon-store"),
      },
      backups: {
        tag: "hassio-backups",
        load: () => import("./backups/hassio-backups"),
      },
      system: {
        tag: "hassio-system",
        load: () => import("./system/hassio-system"),
      },
    },
  };

  protected updatePageEl(el) {
    el.hass = this.hass;
    el.supervisor = this.supervisor;
    el.route = this.route;
    el.narrow = this.narrow;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-panel-router": HassioPanelRouter;
  }
}
