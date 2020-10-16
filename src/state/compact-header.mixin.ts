import { HASSDomEvent } from "../common/dom/fire_event";
import { Constructor, HomeAssistant } from "../types";
import type { PropertyValues } from "lit-element";
import { storeState } from "../util/ha-pref-storage";
import { HassBaseEl } from "./hass-base-mixin";

interface CompactHeaderParams {
  compact: HomeAssistant["compactHeader"];
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-compact-header": CompactHeaderParams;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "hass-compact-header": HASSDomEvent<CompactHeaderParams>;
  }
}

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps: PropertyValues) {
      super.firstUpdated(changedProps);
      this.addEventListener("hass-compact-header", (ev) => {
        this._updateHass({ compactHeader: ev.detail.compact });
        storeState(this.hass!);
      });
    }
  };
