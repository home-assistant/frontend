import { customElement, property } from "lit/decorators";
import type { RouterOptions } from "../../../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../../../layouts/hass-router-page";
import type { HomeAssistant } from "../../../../../types";

@customElement("thread-config-router")
class ThreadConfigRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    showLoading: true,
    routes: {
      dashboard: {
        tag: "thread-config-panel",
        load: () => import("./thread-config-panel"),
      },
      "network-info": {
        tag: "thread-network-info-page",
        load: () => import("./thread-network-info-page"),
        itemId: true,
      },
    },
  };

  protected updatePageEl(el): void {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.isWide = this.isWide;
    el.narrow = this.narrow;
    if (this._currentPage === "network-info") {
      el.datasetId = this.routeTail.path.slice(1);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "thread-config-router": ThreadConfigRouter;
  }
}
