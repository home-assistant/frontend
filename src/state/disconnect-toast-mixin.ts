import { Constructor, LitElement } from "lit-element";
import { HassBaseEl } from "./hass-base-mixin";
import { fireEvent } from "../common/dom/fire_event";

export default (superClass: Constructor<LitElement & HassBaseEl>) =>
  class extends superClass {
    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      // Need to load in advance because when disconnected, can't dynamically load code.
      import(/* webpackChunkName: "notification-manager" */ "../managers/notification-manager");
    }

    protected hassReconnected() {
      super.hassReconnected();

      fireEvent(this, "hass-notification", {
        message: "",
        duration: 1,
      });
    }

    protected hassDisconnected() {
      super.hassDisconnected();

      fireEvent(this, "hass-notification", {
        message: this.hass!.localize("ui.notification_toast.connection_lost"),
        duration: 0,
      });
    }
  };
