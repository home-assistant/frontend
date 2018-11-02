import { afterNextRender } from "@polymer/polymer/lib/utils/render-status";

export default (superClass) =>
  class extends superClass {
    ready() {
      super.ready();
      this.addEventListener("hass-more-info", (e) => this._handleMoreInfo(e));

      // Load it once we are having the initial rendering done.
      afterNextRender(null, () =>
        import(/* webpackChunkName: "more-info-dialog" */ "../../dialogs/ha-more-info-dialog")
      );
    }

    async _handleMoreInfo(ev) {
      if (!this.__moreInfoEl) {
        this.__moreInfoEl = document.createElement("ha-more-info-dialog");
        this.shadowRoot.appendChild(this.__moreInfoEl);
        this.provideHass(this.__moreInfoEl);
      }
      this._updateHass({ moreInfoEntityId: ev.detail.entityId });
    }
  };
