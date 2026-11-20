import { customElement, property } from "lit/decorators";
import type { RouterOptions } from "../../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../../layouts/hass-router-page";
import type { HomeAssistant } from "../../../../types";

@customElement("ha-config-updates-router")
class HaConfigUpdatesRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  protected routerOptions: RouterOptions = {
    defaultPage: "overview",
    routes: {
      overview: {
        tag: "ha-config-section-updates",
        load: () => import("../ha-config-section-updates"),
        cache: true,
      },
      details: {
        tag: "ha-config-update-details",
        load: () => import("./ha-config-update-details"),
        itemId: true,
      },
    },
  };

  protected updatePageEl(pageEl) {
    pageEl.hass = this.hass;
    pageEl.narrow = this.narrow;
    if (this._currentPage === "details") {
      // <entity_id> or <entity_id>/report/<report_id>
      const [entityId, subpage, reportId] = this.routeTail.path
        .slice(1)
        .split("/");
      pageEl.entityId = decodeURIComponent(entityId);
      pageEl.reportId =
        subpage === "report" && reportId
          ? decodeURIComponent(reportId)
          : undefined;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-updates-router": HaConfigUpdatesRouter;
  }
}
