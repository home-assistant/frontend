import { PolymerElement } from "@polymer/polymer";
import { customElement, property } from "lit-element";
import { HassioHassOSInfo, HassioHostInfo } from "../../src/data/hassio/host";
import {
  HassioHomeAssistantInfo,
  HassioSupervisorInfo,
} from "../../src/data/hassio/supervisor";
import {
  HassRouterPage,
  RouterOptions,
} from "../../src/layouts/hass-router-page";
import { HomeAssistant } from "../../src/types";
import "./addon-store/hassio-addon-store";
// Don't codesplit it, that way the dashboard always loads fast.
import "./dashboard/hassio-dashboard";
// Don't codesplit the others, because it breaks the UI when pushed to a Pi
import "./snapshots/hassio-snapshots";
import "./system/hassio-system";

@customElement("hassio-tabs-router")
class HassioTabsRouter extends HassRouterPage {
  @property() public hass!: HomeAssistant;

  @property() public supervisorInfo: HassioSupervisorInfo;

  @property() public hostInfo: HassioHostInfo;

  @property() public hassInfo: HassioHomeAssistantInfo;

  @property() public hassOsInfo!: HassioHassOSInfo;

  protected routerOptions: RouterOptions = {
    routes: {
      dashboard: {
        tag: "hassio-dashboard",
      },
      snapshots: {
        tag: "hassio-snapshots",
      },
      store: {
        tag: "hassio-addon-store",
      },
      system: {
        tag: "hassio-system",
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
        hassOsInfo: this.hassOsInfo,
      });
    } else {
      el.hass = this.hass;
      el.supervisorInfo = this.supervisorInfo;
      el.hostInfo = this.hostInfo;
      el.hassInfo = this.hassInfo;
      el.hassOsInfo = this.hassOsInfo;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-tabs-router": HassioTabsRouter;
  }
}
