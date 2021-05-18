import { mdiNetwork, mdiWrench } from "@mdi/js";
import { customElement, property } from "lit/decorators";
import { navigate } from "../../../../../common/navigate";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../../../layouts/hass-router-page";
import { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";
import { HomeAssistant } from "../../../../../types";

export const ozwNodeTabs = (
  instance: number,
  node: number
): PageNavigation[] => [
  {
    translationKey: "ui.panel.config.ozw.navigation.node.dashboard",
    path: `/config/ozw/network/${instance}/node/${node}/dashboard`,
    iconPath: mdiNetwork,
  },
  {
    translationKey: "ui.panel.config.ozw.navigation.node.config",
    path: `/config/ozw/network/${instance}/node/${node}/config`,
    iconPath: mdiWrench,
  },
];

@customElement("ozw-node-router")
class OZWNodeRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  @property() public ozwInstance!: number;

  @property() public nodeId!: number;

  private _configEntry = new URLSearchParams(window.location.search).get(
    "config_entry"
  );

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    showLoading: true,
    routes: {
      dashboard: {
        tag: "ozw-node-dashboard",
        load: () => import("./ozw-node-dashboard"),
      },
      config: {
        tag: "ozw-node-config",
        load: () => import("./ozw-node-config"),
      },
    },
  };

  protected updatePageEl(el): void {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.isWide = this.isWide;
    el.narrow = this.narrow;
    el.configEntryId = this._configEntry;
    el.ozwInstance = this.ozwInstance;
    el.nodeId = this.nodeId;

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
}

declare global {
  interface HTMLElementTagNameMap {
    "ozw-node-router": OZWNodeRouter;
  }
}
