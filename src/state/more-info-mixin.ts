import { HassBaseEl } from "./hass-base-mixin";
import { Constructor } from "../types";

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-more-info": {
      entityId: string | null;
    };
  }
}

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    private _moreInfoEl?: any;

    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this.addEventListener("hass-more-info", (e) => this._handleMoreInfo(e));

      // Load it once we are having the initial rendering done.
      import(/* webpackChunkName: "more-info-dialog" */ "../dialogs/ha-more-info-dialog");
    }

    private async _handleMoreInfo(ev) {
      if (!this._moreInfoEl) {
        this._moreInfoEl = document.createElement("ha-more-info-dialog");
        this.shadowRoot!.appendChild(this._moreInfoEl);
        this.provideHass(this._moreInfoEl);
      }
      this._updateHass({ moreInfoEntityId: ev.detail.entityId });
    }
  };
