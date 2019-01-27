import applyThemesOnElement from "../../common/dom/apply_themes_on_element";
import { storeState } from "../../util/ha-pref-storage";
import { subscribeThemes } from "../../data/ws-themes";

export default (superClass) =>
  class extends superClass {
    firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this.addEventListener("settheme", (ev) => {
        this._updateHass({ selectedTheme: ev.detail });
        this._applyTheme();
        storeState(this.hass);
      });
    }

    hassConnected() {
      super.hassConnected();

      subscribeThemes(this.hass.connection, (themes) => {
        this._updateHass({ themes });
        this._applyTheme();
      });
    }

    _applyTheme() {
      applyThemesOnElement(
        document.documentElement,
        this.hass.themes,
        this.hass.selectedTheme,
        true
      );
    }
  };
