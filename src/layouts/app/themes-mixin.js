import applyThemesOnElement from '../../common/dom/apply_themes_on_element.js';
import { storeState } from '../../util/ha-pref-storage.js';

export default superClass => class extends superClass {
  ready() {
    super.ready();
    this.addEventListener('settheme', e => this._setTheme(e));
  }

  hassConnected() {
    super.hassConnected();

    this.hass.callWS({
      type: 'frontend/get_themes',
    }).then((themes) => {
      this._updateHass({ themes });
      applyThemesOnElement(
        document.documentElement,
        themes,
        this.hass.selectedTheme,
        true
      );
    });

    this.hass.connection.subscribeEvents((event) => {
      this._updateHass({ themes: event.data });
      applyThemesOnElement(
        document.documentElement,
        event.data,
        this.hass.selectedTheme,
        true
      );
    }, 'themes_updated').then(unsub => this.unsubFuncs.push(unsub));
  }

  _setTheme(event) {
    this._updateHass({ selectedTheme: event.detail });
    applyThemesOnElement(
      document.documentElement,
      this.hass.themes,
      this.hass.selectedTheme,
      true
    );
    storeState(this.hass);
  }
};
