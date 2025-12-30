import { customElement, property } from "lit/decorators";
import type { RouterOptions } from "../../../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../../../layouts/hass-router-page";
import { navigate } from "../../../../../common/navigate";
import { getConfigEntries } from "../../../../../data/config_entries";
import type { HomeAssistant } from "../../../../../types";

@customElement("zha-config-dashboard-router")
class ZHAConfigDashboardRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  private _configEntry = new URLSearchParams(window.location.search).get(
    "config_entry"
  );

  protected routerOptions: RouterOptions = {
    defaultPage: "picker",
    showLoading: true,
    routes: {
      picker: {
        tag: "zha-config-entry-picker",
        load: () => import("./zha-config-entry-picker"),
      },
      dashboard: {
        tag: "zha-config-dashboard",
        load: () => import("./zha-config-dashboard"),
      },
      add: {
        tag: "zha-add-devices-page",
        load: () => import("./zha-add-devices-page"),
      },
      groups: {
        tag: "zha-groups-dashboard",
        load: () => import("./zha-groups-dashboard"),
      },
      group: {
        tag: "zha-group-page",
        load: () => import("./zha-group-page"),
      },
      "group-add": {
        tag: "zha-add-group-page",
        load: () => import("./zha-add-group-page"),
      },
      visualization: {
        tag: "zha-network-visualization-page",
        load: () => import("./zha-network-visualization-page"),
      },
    },
    initialLoad: () => this._fetchConfigEntries(),
  };

  protected updatePageEl(el): void {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.isWide = this.isWide;
    el.narrow = this.narrow;

    // Only pass configEntryId to pages that need it (not the picker)
    if (this.routeTail.path !== "picker") {
      el.configEntryId = this._configEntry;
    }

    if (this._currentPage === "group") {
      el.groupId = this.routeTail.path.substr(1);
    } else if (this._currentPage === "device") {
      el.ieee = this.routeTail.path.substr(1);
    } else if (this._currentPage === "visualization") {
      el.zoomedDeviceIdFromURL = this.routeTail.path.substr(1);
    }

    const searchParams = new URLSearchParams(window.location.search);
    if (this._configEntry && !searchParams.has("config_entry")) {
      searchParams.append("config_entry", this._configEntry);
      navigate(
        `${this.routeTail.prefix}${
          this.routeTail.path
        }?${searchParams.toString()}`,
        { replace: true }
      );
    }
  }

  private async _fetchConfigEntries() {
    if (this._configEntry) {
      return;
    }
    const entries = await getConfigEntries(this.hass, {
      domain: "zha",
    });
    // Only auto-select if there's exactly one entry
    if (entries.length === 1) {
      this._configEntry = entries[0].entry_id;
      // Redirect to dashboard with the config entry
      navigate(`/config/zha/dashboard?config_entry=${this._configEntry}`, {
        replace: true,
      });
    }
    // Otherwise, let the picker page handle showing the list
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-config-dashboard-router": ZHAConfigDashboardRouter;
  }
}
