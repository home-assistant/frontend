import { HassBaseEl } from "./hass-base-mixin";
import { showToast } from "../util/toast";
import { Constructor } from "../types";

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      // Need to load in advance because when disconnected, can't dynamically load code.
      import(
        /* webpackChunkName: "notification-manager" */ "../managers/notification-manager"
      );
    }

    protected hassReconnected() {
      super.hassReconnected();

      showToast(this, {
        message: "",
        duration: 1,
      });
    }

    protected hassDisconnected() {
      super.hassDisconnected();

      showToast(this, {
        message: this.hass!.localize("ui.notification_toast.connection_lost"),
        duration: 0,
        dismissable: false,
      });
    }
  };
