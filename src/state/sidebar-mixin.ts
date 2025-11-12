import type { HASSDomEvent } from "../common/dom/fire_event";
import type { CoreFrontendUserData } from "../data/frontend";
import { saveFrontendUserData } from "../data/frontend";
import { DEFAULT_PANEL } from "../data/panel";
import type { Constructor, HomeAssistant } from "../types";
import { storeState } from "../util/ha-pref-storage";
import type { HassBaseEl } from "./hass-base-mixin";

interface DockSidebarParams {
  dock: HomeAssistant["dockedSidebar"];
}

interface DefaultBrowserPanelParams {
  defaultPanel: HomeAssistant["defaultBrowserPanel"];
}

interface DefaultUserPanelParams {
  defaultPanel: CoreFrontendUserData["defaultPanel"];
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-dock-sidebar": DockSidebarParams;
    "hass-default-browser-panel": DefaultBrowserPanelParams;
    "hass-default-user-panel": DefaultUserPanelParams;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "hass-dock-sidebar": HASSDomEvent<DockSidebarParams>;
    "hass-default-browser-panel": HASSDomEvent<DefaultBrowserPanelParams>;
    "hass-default-user-panel": HASSDomEvent<DefaultUserPanelParams>;
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
      this.addEventListener("hass-default-browser-panel", (ev) => {
        this._updateHass({ defaultBrowserPanel: ev.detail.defaultPanel });
        storeState(this.hass!);
      });
      this.addEventListener("hass-default-user-panel", (ev) => {
        const newPanel = ev.detail.defaultPanel;
        const updated: CoreFrontendUserData = { ...this.hass!.userData };

        if (newPanel == null || newPanel === "" || newPanel === DEFAULT_PANEL) {
          delete updated.defaultPanel;
        } else {
          updated.defaultPanel = newPanel;
        }

        saveFrontendUserData(this.hass!.connection, "core", updated).catch(
          (err) => {
            // eslint-disable-next-line no-console
            console.error("Failed to save default user panel:", err);
          }
        );
      });
    }
  };
