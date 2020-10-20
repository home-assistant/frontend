import type { Constructor, PropertyValues } from "lit-element";
import { HassElement } from "./hass-element";
import {
  QuickBarParams,
  showQuickBar,
} from "../dialogs/quick-bar/show-dialog-quick-bar";
import { HomeAssistant } from "../types";

declare global {
  interface HASSDomEvents {
    "hass-quick-bar": QuickBarParams;
  }
}

const isMacOS = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);

export default <T extends Constructor<HassElement>>(superClass: T) =>
  class extends superClass {
    private _isAdmin = false;

    private _isRegistered = false;

    protected updated(changedProps: PropertyValues) {
      super.updated(changedProps);
      if (changedProps.has("hass")) {
        if (this.hass?.user) {
          this._isAdmin = this.hass?.user?.is_admin || false;
          if (this._isAdmin) {
            this._registerShortcut();
          }
        }
      }
    }

    protected firstUpdated(changedProps: PropertyValues) {
      super.firstUpdated(changedProps);

      if (this._isAdmin) {
        this._registerShortcut();
      }
    }

    // protected shouldUpdate(changedProps: PropertyValues) {
    //   super.shouldUpdate(changedProps);
    //   if (changedProps.has("hass")) {
    //     const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    //     if (this.hass?.user !== oldHass?.user) {
    //       return true;
    //     }
    //   }
    //   return false;
    // }

    private _registerShortcut() {
      document.addEventListener("keydown", (e: KeyboardEvent) => {
        if (this.isOSCtrlKey(e) && e.code === "KeyP") {
          e.preventDefault();
          const eventParams: QuickBarParams = {};
          if (e.shiftKey) {
            eventParams.commandMode = true;
          }
          this._isRegistered = true;
          showQuickBar(this, eventParams);
        }
      });
    }

    private isOSCtrlKey(e: KeyboardEvent) {
      return isMacOS ? e.metaKey : e.ctrlKey;
    }
  };
