import { Constructor, LitElement } from "lit-element";
import { HassBaseEl } from "./hass-base-mixin";
import { showZHADeviceInfoDialog } from "../dialogs/zha-device-info-dialog/show-dialog-zha-device-info";

declare global {
  // for fire event
  interface HASSDomEvents {
    "zha-show-device-dialog": {
      ieee: string;
    };
  }
}

export default (superClass: Constructor<LitElement & HassBaseEl>) =>
  class extends superClass {
    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this.addEventListener("zha-show-device-dialog", (e) =>
        showZHADeviceInfoDialog(e.target, e.detail)
      );
    }
  };
