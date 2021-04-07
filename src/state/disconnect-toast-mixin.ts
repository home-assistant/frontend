import {
  STATE_NOT_RUNNING,
  STATE_RUNNING,
  STATE_STARTING,
} from "home-assistant-js-websocket";
import { Constructor } from "../types";
import { showToast } from "../util/toast";
import { HassBaseEl } from "./hass-base-mixin";

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    private _subscribed?: Promise<() => Promise<void>>;

    private _dismissed = false;

    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      // Need to load in advance because when disconnected, can't dynamically load code.
      import("../managers/notification-manager");
    }

    updated(changedProperties) {
      super.updated(changedProperties);
      const oldHass = changedProperties.get("hass");
      if (
        !changedProperties.has("hass") ||
        !this.hass!.config ||
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
          action: {
            text:
              this.hass!.localize("ui.notification_toast.dismiss") || "Dismiss",
            action: () => {
              this._dismissed = true;
            },
          },
        });
        this._subscribeBootstrapIntergrations();
      } else if (
        oldHass?.config &&
        oldHass.config.state === STATE_NOT_RUNNING &&
        (this.hass!.config.state === STATE_STARTING ||
          this.hass!.config.state === STATE_RUNNING)
      ) {
        this._unsubscribeBootstrapIntergrations();
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

    private _handleMessage(message: any): void {
      if (this._dismissed || this.hass!.config.state !== STATE_NOT_RUNNING) {
        return;
      }

      if (Object.keys(message).length === 0) {
        showToast(this, {
          message:
            this.hass!.localize("ui.notification_toast.wrapping_up_startup") ||
            `Wrapping up startup, not everything will be available until it is finished.`,
          duration: 0,
          dismissable: false,
          action: {
            text:
              this.hass!.localize("ui.notification_toast.dismiss") || "Dismiss",
            action: () => {
              this._dismissed = true;
            },
          },
        });
        return;
      }

      // Show the integration that has been starting for the longest time
      const max = Object.keys(message).reduce(
        (a, v) => Math.max(a, message[v]),
        -Infinity
      );
      const integration = Object.keys(message).filter(
        (v) => message[v] === max
      );

      showToast(this, {
        message:
          this.hass!.localize(
            "ui.notification_toast.intergration_starting",
            "integration",
            domainToName(this.hass.localize, integration)
          ) ||
          `Starting ${integration}, not everything will be available until it is finished.`,
        duration: 0,
        dismissable: false,
        action: {
          text:
            this.hass!.localize("ui.notification_toast.dismiss") || "Dismiss",
          action: () => {
            this._dismissed = true;
          },
        },
      });
    }

    private _unsubscribeBootstrapIntergrations() {
      if (this._subscribed) {
        this._subscribed.then((unsub) => unsub());
        this._subscribed = undefined;
      }
    }

    private _subscribeBootstrapIntergrations() {
      if (!this.hass) {
        return;
      }
      this._subscribed = this.hass.connection.subscribeMessage(
        (message) => this._handleMessage(message),
        {
          type: "subscribe_bootstrap_integrations",
        }
      );
    }
  };
