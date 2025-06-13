import type { HASSDomEvent } from "../common/dom/fire_event";
import type { Constructor, HomeAssistant } from "../types";
import { storeState } from "../util/ha-pref-storage";
import type { HassBaseEl } from "./hass-base-mixin";

interface DockSidebarParams {
  dock: HomeAssistant["dockedSidebar"];
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-dock-sidebar": DockSidebarParams;
    "hass-set-sidebar-data": HomeAssistant["sidebar"];
  }
  // for add event listener
  interface HTMLElementEventMap {
    "hass-dock-sidebar": HASSDomEvent<DockSidebarParams>;
    "hass-set-sidebar-data": HASSDomEvent<HomeAssistant["sidebar"]>;
  }
}

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this.addEventListener("hass-dock-sidebar", (ev) => {
        this._updateHass({ dockedSidebar: ev.detail.dock });
        storeState(this.hass!);
      });
      this.addEventListener("hass-set-sidebar-data", async (ev) => {
        this._updateHass({
          sidebar: ev.detail,
        });
        storeState(this.hass!);
      });
    }
  };
