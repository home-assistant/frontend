import { customElement, property, state } from "lit/decorators";
import { mdiNetwork, mdiFolderMultipleOutline } from "@mdi/js";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../../../layouts/hass-router-page";
import { HomeAssistant } from "../../../../../types";
import { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";

export const insteonDeviceTabs: PageNavigation[] = [
  {
    translationKey: "ui.panel.config.insteon.aldb.caption",
    path: `/config/insteon/device/aldb/`,
    iconPath: mdiNetwork,
  },
  {
    translationKey: "ui.panel.config.insteon.properties.caption",
    path: `/config/insteon/device/properties/`,
    iconPath: mdiFolderMultipleOutline,
  },
];

@customElement("insteon-config-device-router")
class InsteonConfigDeviceRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private deviceId?: string | undefined = undefined;

  protected routerOptions: RouterOptions = {
    defaultPage: "aldb",
    showLoading: true,
    routes: {
      aldb: {
        tag: "insteon-config-device-aldb-page",
        load: () => import("./insteon-config-device-aldb-page"),
      },
      properties: {
        tag: "insteon-config-device-properties-page",
        load: () => import("./insteon-config-device-properties-page"),
      },
    },
  };

  protected updatePageEl(el): void {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.isWide = this.isWide;
    el.narrow = this.narrow;
    if (this.routeTail.path.substr(1)) {
      this.deviceId = this.routeTail.path.substr(1);
    }
    insteonDeviceTabs[0].path = "/config/insteon/device/aldb/" + this.deviceId;
    insteonDeviceTabs[1].path =
      "/config/insteon/device/properties/" + this.deviceId;
    el.deviceId = this.deviceId;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-config-device-router": InsteonConfigDeviceRouter;
  }
}
