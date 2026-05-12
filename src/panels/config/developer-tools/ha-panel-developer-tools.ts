import type { PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import type { RouterOptions } from "../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../layouts/hass-router-page";
import type { HomeAssistant, Route } from "../../../types";

type DeveloperToolsPageElement = HTMLElement & {
  hass: HomeAssistant;
  narrow: boolean;
  route: Route;
};

@customElement("ha-panel-developer-tools")
class PanelDeveloperTools extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  protected routerOptions: RouterOptions = {
    defaultPage: "yaml",
    cacheAll: true,
    routes: {
      event: {
        tag: "developer-tools-event",
        load: () => import("./event/developer-tools-event"),
      },
      service: "action",
      action: {
        tag: "developer-tools-action",
        load: () => import("./action/developer-tools-action"),
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

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this.hass.loadBackendTranslation("title");
  }

  protected updatePageEl(pageEl: DeveloperToolsPageElement) {
    pageEl.hass = this.hass;
    pageEl.narrow = this.narrow;
    pageEl.route = this.routeTail;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-developer-tools": PanelDeveloperTools;
  }
}
