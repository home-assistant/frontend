import { mdiServerNetwork, mdiMathLog, mdiNetwork } from "@mdi/js";
import { customElement, property } from "lit/decorators";
import type { RouterOptions } from "../../../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../../../layouts/hass-router-page";
import type { HomeAssistant } from "../../../../../types";
import { navigate } from "../../../../../common/navigate";
import type { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";
import { getConfigEntries } from "../../../../../data/config_entries";

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

  private _configEntry = new URLSearchParams(window.location.search).get(
    "config_entry"
  );

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    showLoading: true,
    routes: {
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
    initialLoad: () => this._fetchConfigEntries(),
  };

  protected updatePageEl(el): void {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.isWide = this.isWide;
    el.narrow = this.narrow;
    el.configEntryId = this._configEntry;

    const searchParams = new URLSearchParams(window.location.search);
    if (this._configEntry && !searchParams.has("config_entry")) {
      searchParams.append("config_entry", this._configEntry);
      navigate(
        `${this.routeTail.prefix}${
          this.routeTail.path
        }?${searchParams.toString()}`,
        { replace: true }
      );
    }
  }

  private async _fetchConfigEntries() {
    if (this._configEntry) {
      return;
    }
    const entries = await getConfigEntries(this.hass, {
      domain: "zwave_js",
    });
    if (entries.length) {
      this._configEntry = entries[0].entry_id;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-config-router": ZWaveJSConfigRouter;
  }
}
