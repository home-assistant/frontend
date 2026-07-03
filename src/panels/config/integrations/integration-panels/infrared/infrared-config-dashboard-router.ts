import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { InfraredDevice } from "../../../../../data/infrared";
import { computeInfraredDevices } from "../../../../../data/infrared";
import type { RouterOptions } from "../../../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../../../layouts/hass-router-page";
import type { HomeAssistant } from "../../../../../types";

@customElement("infrared-config-dashboard-router")
class InfraredConfigDashboardRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    showLoading: true,
    routes: {
      dashboard: {
        tag: "infrared-config-dashboard",
        load: () => import("./infrared-config-dashboard"),
      },
      devices: {
        tag: "infrared-devices-page",
        load: () => import("./infrared-devices-page"),
      },
    },
  };

  private _devices = memoizeOne(
    (
      entities: HomeAssistant["entities"],
      states: HomeAssistant["states"],
      devices: HomeAssistant["devices"]
    ): InfraredDevice[] => computeInfraredDevices(entities, states, devices)
  );

  protected updatePageEl(el): void {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.isWide = this.isWide;
    el.narrow = this.narrow;
    el.devices = this._devices(
      this.hass.entities,
      this.hass.states,
      this.hass.devices
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "infrared-config-dashboard-router": InfraredConfigDashboardRouter;
  }
}
