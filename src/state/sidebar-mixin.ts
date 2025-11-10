import type { HASSDomEvent } from "../common/dom/fire_event";
import { saveFrontendUserData } from "../data/frontend";
import type { Constructor, HomeAssistant } from "../types";
import { storeState } from "../util/ha-pref-storage";
import type { HassBaseEl } from "./hass-base-mixin";

interface DockSidebarParams {
  dock: HomeAssistant["dockedSidebar"];
}

interface DefaultPanelParams {
  defaultPanel: HomeAssistant["defaultPanel"];
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-dock-sidebar": DockSidebarParams;
    "hass-default-panel": DefaultPanelParams;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "hass-dock-sidebar": HASSDomEvent<DockSidebarParams>;
    "hass-default-panel": HASSDomEvent<DefaultPanelParams>;
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
      this.addEventListener("hass-default-panel", (ev) => {
        const defaultPanel = ev.detail.defaultPanel;
        this._updateHass({ defaultPanel });
        storeState(this.hass!);
        try {
          saveFrontendUserData(
            this.hass!.connection,
            "default_panel",
            defaultPanel
          );
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Failed to save default panel", err);
        }
      });
    }
  };
