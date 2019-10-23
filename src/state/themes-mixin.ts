import { applyThemesOnElement } from "../common/dom/apply_themes_on_element";
import { storeState } from "../util/ha-pref-storage";
import { subscribeThemes } from "../data/ws-themes";
import { HassBaseEl } from "./hass-base-mixin";
import { HASSDomEvent } from "../common/dom/fire_event";
import { Constructor } from "../types";

declare global {
  // for add event listener
  interface HTMLElementEventMap {
    settheme: HASSDomEvent<string>;
  }
}

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this.addEventListener("settheme", (ev) => {
        this._updateHass({ selectedTheme: ev.detail });
        this._applyTheme();
        storeState(this.hass!);
      });
    }

    protected hassConnected() {
      super.hassConnected();

      subscribeThemes(this.hass!.connection, (themes) => {
        this._updateHass({ themes });
        this._applyTheme();
      });
    }

    private _applyTheme() {
      applyThemesOnElement(
        document.documentElement,
        this.hass!.themes,
        this.hass!.selectedTheme,
        true
      );
    }
  };
