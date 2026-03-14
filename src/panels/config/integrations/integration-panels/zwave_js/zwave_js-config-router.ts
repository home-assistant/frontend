import { mdiNetwork, mdiServerNetwork, mdiTextBoxOutline } from "@mdi/js";
import { customElement, property } from "lit/decorators";
import type { RouterOptions } from "../../../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../../../layouts/hass-router-page";
import type { HomeAssistant } from "../../../../../types";
import type { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";

export const configTabs: PageNavigation[] = [
  {
    translationKey: "ui.panel.config.zwave_js.navigation.network",
    path: `/config/zwave_js/dashboard`,
    iconPath: mdiServerNetwork,
  },
  {
    translationKey: "ui.panel.config.zwave_js.navigation.logs",
    path: `/config/zwave_js/logs`,
    iconPath: mdiTextBoxOutline,
  },
  {
    translationKey: "ui.panel.config.zwave_js.navigation.visualization",
    path: `/config/zwave_js/visualization`,
    iconPath: mdiNetwork,
  },
];

@customElement("zwave_js-config-router")
class ZWaveJSConfigRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  private _configEntry: string | null = null;

  protected routerOptions: RouterOptions = {
    defaultPage: "picker",
    showLoading: true,
    // Make sure that we have a config entry in the URL before rendering other pages
    beforeRender: (page) => {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has("config_entry")) {
        this._configEntry = searchParams.get("config_entry");
      } else if (page === "picker") {
        this._configEntry = null;
        return undefined;
      }

      if ((!page || page === "picker") && this._configEntry) {
        return "dashboard";
      }

      if ((!page || page !== "picker") && !this._configEntry) {
        return "picker";
      }

      return undefined;
    },
    routes: {
      picker: {
        tag: "zwave_js-config-entry-picker",
        load: () => import("./zwave_js-config-entry-picker"),
      },
      dashboard: {
        tag: "zwave_js-config-dashboard",
        load: () => import("./zwave_js-config-dashboard"),
      },
      add: {
        tag: "zwave_js-add-node",
        load: () => import("./add-node/zwave_js-add-node"),
      },
      node_config: {
        tag: "zwave_js-node-config",
        load: () => import("./zwave_js-node-config"),
      },
      node_installer: {
        tag: "zwave_js-node-installer",
        load: () => import("./zwave_js-node-installer"),
      },
      logs: {
        tag: "zwave_js-logs",
        load: () => import("./zwave_js-logs"),
      },
      provisioned: {
        tag: "zwave_js-provisioned",
        load: () => import("./zwave_js-provisioned"),
      },
      visualization: {
        tag: "zwave_js-network-visualization",
        load: () => import("./zwave_js-network-visualization"),
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
    "zwave_js-config-router": ZWaveJSConfigRouter;
  }
}
