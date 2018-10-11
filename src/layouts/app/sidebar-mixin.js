import { storeState } from "../../util/ha-pref-storage.js";

export default (superClass) =>
  class extends superClass {
    ready() {
      super.ready();
      this.addEventListener("hass-dock-sidebar", (e) =>
        this._handleDockSidebar(e)
      );
    }

    _handleDockSidebar(ev) {
      this._updateHass({ dockedSidebar: ev.detail.dock });
      storeState(this.hass);
    }
  };
