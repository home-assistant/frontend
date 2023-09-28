import { PolymerElement } from "@polymer/polymer";
import { customElement, property } from "lit/decorators";
import { HassRouterPage, RouterOptions } from "../../layouts/hass-router-page";
import { HomeAssistant } from "../../types";

@customElement("developer-tools-router")
class DeveloperToolsRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  protected routerOptions: RouterOptions = {
    // defaultPage: "info",
    beforeRender: (page) => {
      if (!page || page === "not_found") {
        // If we can, we are going to restore the last visited page.
        return this._currentPage ? this._currentPage : "yaml";
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
      statistics: {
        tag: "developer-tools-statistics",
        load: () => import("./statistics/developer-tools-statistics"),
      },
      yaml: {
        tag: "developer-yaml-config",
        load: () => import("./yaml_configuration/developer-yaml-config"),
      },
      assist: {
        tag: "developer-tools-assist",
        load: () => import("./assist/developer-tools-assist"),
      },
      debug: {
        tag: "developer-tools-debug",
        load: () => import("./debug/developer-tools-debug"),
      },
    },
  };

  protected createLoadingScreen() {
    const loadingScreen = super.createLoadingScreen();
    loadingScreen.noToolbar = true;
    return loadingScreen;
  }

  protected createErrorScreen(error: string) {
    const errorEl = super.createErrorScreen(error);
    errorEl.toolbar = false;
    return errorEl;
  }

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
