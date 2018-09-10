import applyThemesOnElement from '../../common/dom/apply_themes_on_element.js';
import { storeState } from '../../util/ha-pref-storage.js';
import { subscribeThemes } from '../../data/ws-themes.js';

export default superClass => class extends superClass {
  ready() {
    super.ready();

    this.addEventListener('settheme', (ev) => {
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
