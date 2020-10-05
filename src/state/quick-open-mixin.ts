import { showDialog } from "../dialogs/make-dialog-manager";
import type { Constructor } from "../types";
import type { HassBaseEl } from "./hass-base-mixin";
import type { QuickOpenDialogParams } from "../dialogs/quick-open/ha-quick-open-dialog";
import type { PropertyValues } from "lit-element";
import { fireEvent, HASSDomEvent } from "../common/dom/fire_event";
import { HassElement } from "./hass-element";

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-quick-open": QuickOpenDialogParams;
    "hass-service-called": HassServiceCalledParams;
  }
}

export interface HassServiceCalledParams {
  domain: string;
  service: string;
  serviceData?: {};
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

export default <T extends Constructor<HassElement>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps: PropertyValues) {
      super.firstUpdated(changedProps);
      this.addEventListener("hass-quick-open", (ev) =>
        this._handleQuickOpen(ev)
      );

      document.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.code === "KeyP" && e.metaKey) {
          e.preventDefault();
          let eventParams = {};
          if (e.shiftKey) {
            eventParams = {
              commandMode: true,
            };
          }

          // Load it once we are having the initial rendering done.
          importQuickOpen();

          fireEvent(this, "hass-quick-open", eventParams);
        }
      });
    }

    private async _handleQuickOpen(ev: HASSDomEvent<QuickOpenDialogParams>) {
      showDialog(
        this,
        this.shadowRoot!,
        "ha-quick-open-dialog",
        {
          entityFilter: ev.detail.entityFilter,
          commandMode: ev.detail.commandMode,
        },
        importQuickOpen
      );
    }
  };
