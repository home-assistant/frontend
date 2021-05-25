import { customElement, property } from "lit/decorators";
import { navigate } from "../../../../../common/navigate";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../../../layouts/hass-router-page";
import { HomeAssistant } from "../../../../../types";

@customElement("zwave-config-router")
class ZWaveConfigRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  private _configEntry = new URLSearchParams(window.location.search).get(
    "config_entry"
  );

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    showLoading: true,
    routes: {
      dashboard: {
        tag: "ha-config-zwave",
        load: () =>
          import(/* webpackChunkName: "ha-config-zwave" */ "./ha-config-zwave"),
      },
      migration: {
        tag: "zwave-migration",
        load: () =>
          import(/* webpackChunkName: "zwave-migration" */ "./zwave-migration"),
      },
    },
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
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave-config-router": ZWaveConfigRouter;
  }
}
