import { customElement, property } from "lit-element";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../../../layouts/hass-router-page";
import { HomeAssistant } from "../../../../../types";
import { navigate } from "../../../../../common/navigate";
import { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";
import { mdiNetwork, mdiFolderMultipleOutline } from "@mdi/js";

export const insteonDeviceTabs: PageNavigation[] = [
  {
    translationKey: "ui.panel.config.insteon.device.aldb.caption",
    path: `/config/insteon/device/aldb`,
    iconPath: mdiNetwork,
  },
  {
    translationKey: "ui.panel.config.insteon.device.properties.caption",
    path: `/config/insteon/device/properties`,
    iconPath: mdiFolderMultipleOutline,
  },
];

@customElement("insteon-config-device-router")
class InsteonConfigDeviceRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  private _configEntry = new URLSearchParams(window.location.search).get(
    "config_entry"
  );

  protected routerOptions: RouterOptions = {
    defaultPage: "aldb",
    showLoading: true,
    routes: {
      aldb: {
        tag: "insteon-config-device-aldb-page",
        load: () =>
          import(
            /* webpackChunkName: "config-insteon-device-aldb" */ "./insteon-config-device-aldb-page"
          ),
      },
      properties: {
        tag: "insteon-config-device-properties-page",
        load: () =>
          import(
            /* webpackChunkName: "config-insteon-device-properties" */ "./insteon-config-device-aldb-page"
          ),
      },
    },
  };

  protected updatePageEl(el): void {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.isWide = this.isWide;
    el.narrow = this.narrow;
    el.configEntryId = this._configEntry;
    el.groupId = this.routeTail.path.substr(1);

    const searchParams = new URLSearchParams(window.location.search);
    if (this._configEntry && !searchParams.has("config_entry")) {
      searchParams.append("config_entry", this._configEntry);
      navigate(
        this,
        `${this.routeTail.prefix}${
          this.routeTail.path
        }?${searchParams.toString()}`,
        true
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-config-device-router": InsteonConfigDeviceRouter;
  }
}
