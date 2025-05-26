import { customElement, property } from "lit/decorators";
import type { RouterOptions } from "../../../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../../../layouts/hass-router-page";
import type { HomeAssistant } from "../../../../../types";

@customElement("bluetooth-config-dashboard-router")
class BluetoothConfigDashboardRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  private _configEntry = new URLSearchParams(window.location.search).get(
    "config_entry"
  );

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    showLoading: true,
    routes: {
      dashboard: {
        tag: "bluetooth-config-dashboard",
        load: () => import("./bluetooth-config-dashboard"),
      },
      "advertisement-monitor": {
        tag: "bluetooth-advertisement-monitor",
        load: () => import("./bluetooth-advertisement-monitor"),
      },
      "connection-monitor": {
        tag: "bluetooth-connection-monitor",
        load: () => import("./bluetooth-connection-monitor"),
      },
      visualization: {
        tag: "bluetooth-network-visualization",
        load: () => import("./bluetooth-network-visualization"),
      },
    },
  };

  protected updatePageEl(el): void {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.isWide = this.isWide;
    el.narrow = this.narrow;
    el.configEntryId = this._configEntry;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "bluetooth-config-dashboard-router": BluetoothConfigDashboardRouter;
  }
}
