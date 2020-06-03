import { Constructor } from "../types";
import { showToast } from "../util/toast";
import { HassBaseEl } from "./hass-base-mixin";
import {
  STATE_NOT_RUNNING,
  STATE_STARTING,
  STATE_RUNNING,
} from "home-assistant-js-websocket";

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      // Need to load in advance because when disconnected, can't dynamically load code.
      import(
        /* webpackChunkName: "notification-manager" */ "../managers/notification-manager"
      );
    }

    updated(changedProperties) {
      super.updated(changedProperties);
      const oldHass = changedProperties.get("hass");
      if (
        !changedProperties.has("hass") ||
        oldHass?.config?.state === this.hass!.config.state
      ) {
        return;
      }
      if (this.hass!.config.state === STATE_NOT_RUNNING) {
        showToast(this, {
          message:
            this.hass!.localize("ui.notification_toast.starting") ||
            "Home Assistant is starting, not everything will be available until it is finished.",
          duration: 0,
          dismissable: false,
        });
      } else if (
        oldHass?.config &&
        oldHass.config.state === STATE_NOT_RUNNING &&
        (this.hass!.config.state === STATE_STARTING ||
          this.hass!.config.state === STATE_RUNNING)
      ) {
        showToast(this, {
          message: this.hass!.localize("ui.notification_toast.started"),
          duration: 5000,
        });
      }
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
