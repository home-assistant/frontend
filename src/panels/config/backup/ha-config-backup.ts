import type { PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import type { RouterOptions } from "../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../layouts/hass-router-page";
import "../../../layouts/hass-tabs-subpage-data-table";
import type { HomeAssistant } from "../../../types";
import "./ha-config-backup-dashboard";

@customElement("ha-config-backup")
class HaConfigBackup extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    routes: {
      dashboard: {
        tag: "ha-config-backup-dashboard",
        cache: true,
      },
      list: {
        tag: "ha-config-backup-list",
        load: () => import("./ha-config-backup-list"),
      },
      details: {
        tag: "ha-config-backup-details",
        load: () => import("./ha-config-backup-details"),
      },
      locations: {
        tag: "ha-config-backup-locations",
        load: () => import("./ha-config-backup-locations"),
      },
    },
  };

  protected updatePageEl(pageEl, changedProps: PropertyValues) {
    pageEl.hass = this.hass;
    pageEl.route = this.routeTail;

    if (
      (!changedProps || changedProps.has("route")) &&
      this._currentPage === "details"
    ) {
      pageEl.backupSlug = this.routeTail.path.substr(1);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup": HaConfigBackup;
  }
}
