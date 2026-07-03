import { customElement, property } from "lit/decorators";
import type { RouterOptions } from "../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../layouts/hass-router-page";
import type { HomeAssistant } from "../../../types";

@customElement("tools-router")
class ToolsRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

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
        tag: "tools-event",
        load: () => import("./event/tools-event"),
      },
      service: "action",
      action: {
        tag: "tools-action",
        load: () => import("./action/tools-action"),
      },
      state: {
        tag: "tools-state",
        load: () => import("./state/tools-state"),
      },
      template: {
        tag: "tools-template",
        load: () => import("./template/tools-template"),
      },
      statistics: {
        tag: "tools-statistics",
        load: () => import("./statistics/tools-statistics"),
      },
      yaml: {
        tag: "tools-yaml-config",
        load: () => import("./yaml_configuration/tools-yaml-config"),
      },
      assist: {
        tag: "tools-assist",
        load: () => import("./assist/tools-assist"),
      },
      debug: {
        tag: "tools-debug",
        load: () => import("./debug/tools-debug"),
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
    el.hass = this.hass;
    el.narrow = this.narrow;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "tools-router": ToolsRouter;
  }
}
