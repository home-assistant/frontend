import { customElement, property } from "lit-element";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../../../layouts/hass-router-page";
import { HomeAssistant } from "../../../../../types";

@customElement("insteon-config-router")
class InsteonConfigRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  @property() private deviceId?: string;

  private _configEntry = new URLSearchParams(window.location.search).get(
    "config_entry"
  );

  protected routerOptions: RouterOptions = {
    defaultPage: "device",
    showLoading: true,
    routes: {
      device: {
        tag: "insteon-config-device-router",
        load: () =>
          import(
            /* webpackChunkName: "config-insteon-device" */ "./insteon-config-device-router"
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
    if (this._currentPage === "device") {
      this.deviceId = this.routeTail.path.substr(1);
    }
    el.deviceId = this.deviceId;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-config-router": InsteonConfigRouter;
  }
}
