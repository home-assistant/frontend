import { storeState } from "../util/ha-pref-storage";
import { HassBaseEl } from "./hass-base-mixin";
import { HASSDomEvent } from "../common/dom/fire_event";
import { HomeAssistant, Constructor } from "../types";

interface DockSidebarParams {
  dock: HomeAssistant["dockedSidebar"];
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-dock-sidebar": DockSidebarParams;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "hass-dock-sidebar": HASSDomEvent<DockSidebarParams>;
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
    }
  };
