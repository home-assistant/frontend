import { showDialog } from "../dialogs/make-dialog-manager";
import type { Constructor } from "../types";
import type { HassBaseEl } from "./hass-base-mixin";
import type { QuickOpenDialogParams } from "../dialogs/quick-open/ha-quick-open-dialog";
import type { PropertyValues } from "lit-element";
import type { HASSDomEvent } from "../common/dom/fire_event";

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-quick-open": QuickOpenDialogParams;
  }
}

let quickOpenImportPromise;
const importQuickOpen = () => {
  if (!quickOpenImportPromise) {
    quickOpenImportPromise = import(
      /* webpackChunkName: "quick-open-dialog" */ "../dialogs/quick-open/ha-quick-open-dialog"
    );
  }
  return quickOpenImportPromise;
};

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps: PropertyValues) {
      super.firstUpdated(changedProps);
      this.addEventListener("hass-quick-open", (ev) =>
        this._handleQuickOpen(ev)
      );

      // Load it once we are having the initial rendering done.
      importQuickOpen();
    }

    private async _handleQuickOpen(ev: HASSDomEvent<QuickOpenDialogParams>) {
      showDialog(
        this,
        this.shadowRoot!,
        "ha-quick-open-dialog",
        {
          entityId: ev.detail.entityId,
        },
        importQuickOpen
      );
    }
  };
