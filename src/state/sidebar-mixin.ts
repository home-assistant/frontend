import type { PropertyValues } from "lit";
import type { HASSDomEvent } from "../common/dom/fire_event";
import type {
  KioskElement,
  KioskModeParams,
  KioskModeSource,
} from "../data/kiosk_mode";
import {
  combineKioskElementsHidden,
  resolveKioskElementsHidden,
} from "../data/kiosk_mode";
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
    "hass-kiosk-mode": KioskModeParams;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "hass-dock-sidebar": HASSDomEvent<HASSDomEvents["hass-dock-sidebar"]>;
  }
  interface GlobalEventHandlersEventMap {
    "hass-kiosk-mode": HASSDomEvent<HASSDomEvents["hass-kiosk-mode"]>;
  }
}

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    // What each source currently asks kiosk mode to hide. A source is only in
    // here while it has kiosk mode enabled.
    private __kioskRequests = new Map<
      KioskModeSource,
      ReadonlySet<KioskElement>
    >();

    protected firstUpdated(changedProps: PropertyValues<this>) {
      super.firstUpdated(changedProps);
      this.addEventListener("hass-dock-sidebar", (ev) => {
        this._updateHass({ dockedSidebar: ev.detail.dock });
        storeState(this.hass!);
      });
      window.addEventListener("hass-kiosk-mode", (ev) => {
        const source = ev.detail.source ?? "external_app";
        if (ev.detail.enable) {
          this.__kioskRequests.set(
            source,
            resolveKioskElementsHidden(ev.detail)
          );
        } else {
          this.__kioskRequests.delete(source);
        }
        this._updateHass({
          kioskMode: this.__kioskRequests.size > 0,
          kioskElementsHidden: combineKioskElementsHidden(
            this.__kioskRequests.values()
          ),
        });
      });
    }
  };
