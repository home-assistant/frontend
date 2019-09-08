import { Constructor, LitElement } from "lit-element";
import { HassBaseEl } from "./hass-base-mixin";
import {
  showZHADeviceInfoDialog,
  ZHADeviceInfoDialogParams,
} from "../dialogs/zha-device-info-dialog/show-dialog-zha-device-info";
import { HASSDomEvent } from "../common/dom/fire_event";

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
        showZHADeviceInfoDialog(
          e.target as HTMLElement,
          (e as HASSDomEvent<ZHADeviceInfoDialogParams>).detail
        )
      );
    }
  };
