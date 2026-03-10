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
    "hass-kiosk-mode": { enable: boolean };
  }
  // for add event listener
  interface HTMLElementEventMap {
    "hass-dock-sidebar": HASSDomEvent<DockSidebarParams>;
    "hass-kiosk-mode": HASSDomEvent<HASSDomEvents["hass-kiosk-mode"]>;
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
      window.addEventListener("hass-kiosk-mode", (ev) => {
        this._updateHass({ kioskMode: ev.detail.enable });
      });
    }
  };
