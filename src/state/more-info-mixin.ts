import { showDialog } from "../dialogs/make-dialog-manager";
import type { Constructor } from "../types";
import type { HassBaseEl } from "./hass-base-mixin";
import type { MoreInfoDialogParams } from "../dialogs/more-info/ha-more-info-dialog";
import type { PropertyValues } from "lit-element";
import type { HASSDomEvent } from "../common/dom/fire_event";

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-more-info": MoreInfoDialogParams;
  }
}

let moreInfoImportPromise;
const importMoreInfo = () => {
  if (!moreInfoImportPromise) {
    moreInfoImportPromise = import(
      /* webpackChunkName: "more-info-dialog" */ "../dialogs/more-info/ha-more-info-dialog"
    );
  }
  return moreInfoImportPromise;
};

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps: PropertyValues) {
      super.firstUpdated(changedProps);
      this.addEventListener("hass-more-info", (ev) => this._handleMoreInfo(ev));

      // Load it once we are having the initial rendering done.
      importMoreInfo();
    }

    private async _handleMoreInfo(ev: HASSDomEvent<MoreInfoDialogParams>) {
      showDialog(
        this,
        this.shadowRoot!,
        "ha-more-info-dialog",
        {
          entityId: ev.detail.entityId,
        },
        importMoreInfo
      );
    }
  };
