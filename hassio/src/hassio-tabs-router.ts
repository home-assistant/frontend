import {
  HassRouterPage,
  RouterOptions,
} from "../../src/layouts/hass-router-page";
import { customElement, property } from "lit-element";
import { PolymerElement } from "@polymer/polymer";
import { HomeAssistant } from "../../src/types";
// Don't codesplit it, that way the dashboard always loads fast.
import "./dashboard/hassio-dashboard";
import {
  HassioSupervisorInfo,
  HassioHostInfo,
  HassioHomeAssistantInfo,
} from "../../src/data/hassio";

@customElement("hassio-tabs-router")
class HassioTabsRouter extends HassRouterPage {
  @property() public hass!: HomeAssistant;
  @property() public supervisorInfo: HassioSupervisorInfo;
  @property() public hostInfo: HassioHostInfo;
  @property() public hassInfo: HassioHomeAssistantInfo;

  protected routerOptions: RouterOptions = {
    routes: {
      dashboard: {
        tag: "hassio-dashboard",
      },
      snapshots: {
        tag: "hassio-snapshots",
        load: () => import("./snapshots/hassio-snapshots"),
      },
      store: {
        tag: "hassio-addon-store",
        load: () => import("./addon-store/hassio-addon-store"),
      },
      system: {
        tag: "hassio-system",
        load: () => import("./system/hassio-system"),
      },
    },
  };

  protected updatePageEl(el) {
    if ("setProperties" in el) {
      // As long as we have Polymer pages
      (el as PolymerElement).setProperties({
        hass: this.hass,
        supervisorInfo: this.supervisorInfo,
        hostInfo: this.hostInfo,
        hassInfo: this.hassInfo,
      });
    } else {
      el.hass = this.hass;
      el.supervisorInfo = this.supervisorInfo;
      el.hostInfo = this.hostInfo;
      el.hassInfo = this.hassInfo;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-tabs-router": HassioTabsRouter;
  }
}
