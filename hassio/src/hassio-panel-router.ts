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

@customElement("hassio-panel-router")
class HassioPanelRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisorInfo: HassioSupervisorInfo;

  @property({ attribute: false }) public hostInfo: HassioHostInfo;

  @property({ attribute: false }) public hassInfo: HassioHomeAssistantInfo;

  @property({ attribute: false }) public hassOsInfo!: HassioHassOSInfo;

  protected routerOptions: RouterOptions = {
    routes: {
      dashboard: {
        tag: "hassio-dashboard",
      },
      store: {
        tag: "hassio-addon-store",
      },
      snapshots: {
        tag: "hassio-snapshots",
      },
      system: {
        tag: "hassio-system",
      },
    },
  };

  protected updatePageEl(el) {
    el.hass = this.hass;
    el.supervisorInfo = this.supervisorInfo;
    el.hostInfo = this.hostInfo;
    el.hassInfo = this.hassInfo;
    el.hassOsInfo = this.hassOsInfo;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-panel-router": HassioPanelRouter;
  }
}
