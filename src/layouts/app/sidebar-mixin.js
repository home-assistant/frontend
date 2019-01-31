import { storeState } from "../../util/ha-pref-storage";

export default (superClass) =>
  class extends superClass {
    firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this.addEventListener("hass-dock-sidebar", (e) =>
        this._handleDockSidebar(e)
      );
    }

    _handleDockSidebar(ev) {
      this._updateHass({ dockedSidebar: ev.detail.dock });
      storeState(this.hass);
    }
  };
