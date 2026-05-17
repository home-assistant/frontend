import { customElement, property } from "lit/decorators";

import type { PropertyValues } from "lit";
import type { RouterOptions } from "../../layouts/hass-router-page";
import { HassRouterPage } from "../../layouts/hass-router-page";
import type { HomeAssistant } from "../../types";

@customElement("ha-panel-profile")
class HaPanelProfile extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    routes: {
      dashboard: {
        tag: "ha-profile-dashboard",
        load: () => import("./ha-profile-dashboard"),
      },
      preferences: {
        tag: "ha-profile-section-preferences",
        load: () => import("./ha-profile-section-preferences"),
      },
      localization: {
        tag: "ha-profile-section-localization",
        load: () => import("./ha-profile-section-localization"),
      },
      browser: {
        tag: "ha-profile-section-browser",
        load: () => import("./ha-profile-section-browser"),
      },
      security: {
        tag: "ha-profile-section-security",
        load: () => import("./ha-profile-section-security"),
      },
    },
  };

  protected updatePageEl(el) {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.narrow = this.narrow;
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this.style.setProperty(
      "--app-header-background-color",
      "var(--sidebar-background-color)"
    );
    this.style.setProperty(
      "--app-header-text-color",
      "var(--sidebar-text-color)"
    );
    this.style.setProperty(
      "--app-header-border-bottom",
      "1px solid var(--divider-color)"
    );
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-profile": HaPanelProfile;
  }
}
