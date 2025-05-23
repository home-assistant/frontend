import { mdiMathLog, mdiServerNetwork } from "@mdi/js";
import { customElement, property } from "lit/decorators";
import type { RouterOptions } from "../../../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../../../layouts/hass-router-page";
import type { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";
import type { HomeAssistant } from "../../../../../types";

export const configTabs: PageNavigation[] = [
  {
    translationKey: "ui.panel.config.zwave_js.navigation.network",
    path: `/config/zwave_js/dashboard`,
    iconPath: mdiServerNetwork,
  },
  {
    translationKey: "ui.panel.config.zwave_js.navigation.logs",
    path: `/config/zwave_js/logs`,
    iconPath: mdiMathLog,
  },
];

@customElement("matter-config-panel")
class MatterConfigRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    showLoading: true,
    routes: {
      dashboard: {
        tag: "matter-config-dashboard",
        load: () => import("./matter-config-dashboard"),
      },
      add: {
        tag: "matter-add-device",
        load: () => import("./matter-add-device"),
      },
    },
  };

  protected updatePageEl(el): void {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.isWide = this.isWide;
    el.narrow = this.narrow;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-config-panel": MatterConfigRouter;
  }
}
