import { HassRouterPage, RouterOptions } from "../../layouts/hass-router-page";
import { customElement, property } from "lit-element";
import { PolymerElement } from "@polymer/polymer";
import { HomeAssistant } from "../../types";

@customElement("developer-tools-router")
class DeveloperToolsRouter extends HassRouterPage {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;

  protected routerOptions: RouterOptions = {
    // defaultPage: "info",
    beforeRender: (page) => {
      if (!page || page === "not_found") {
        // If we can, we are going to restore the last visited page.
        return this._currentPage ? this._currentPage : "info";
      }
      return undefined;
    },
    cacheAll: true,
    showLoading: true,
    routes: {
      event: {
        tag: "developer-tools-event",
        load: () => import("./event/developer-tools-event"),
      },
      info: {
        tag: "developer-tools-info",
        load: () => import("./info/developer-tools-info"),
      },
      logs: {
        tag: "developer-tools-logs",
        load: () => import("./logs/developer-tools-logs"),
      },
      mqtt: {
        tag: "developer-tools-mqtt",
        load: () => import("./mqtt/developer-tools-mqtt"),
      },
      service: {
        tag: "developer-tools-service",
        load: () => import("./service/developer-tools-service"),
      },
      state: {
        tag: "developer-tools-state",
        load: () => import("./state/developer-tools-state"),
      },
      template: {
        tag: "developer-tools-template",
        load: () => import("./template/developer-tools-template"),
      },
    },
  };

  protected updatePageEl(el) {
    if ("setProperties" in el) {
      // As long as we have Polymer pages
      (el as PolymerElement).setProperties({
        hass: this.hass,
        narrow: this.narrow,
      });
    } else {
      el.hass = this.hass;
      el.narrow = this.narrow;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-router": DeveloperToolsRouter;
  }
}
