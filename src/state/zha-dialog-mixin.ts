import { UpdatingElement } from "lit-element";
import { HASSDomEvent } from "../common/dom/fire_event";
import {
  showZHADeviceInfoDialog,
  ZHADeviceInfoDialogParams,
} from "../dialogs/zha-device-info-dialog/show-dialog-zha-device-info";
import { Constructor } from "../types";
import { HassBaseEl } from "./hass-base-mixin";

declare global {
  // for fire event
  interface HASSDomEvents {
    "zha-show-device-dialog": {
      ieee: string;
    };
  }
}

export default (superClass: Constructor<UpdatingElement & HassBaseEl>) =>
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
