import {
  STATE_NOT_RUNNING,
  STATE_RUNNING,
  STATE_STARTING,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import {
  BootstrapIntegrationsTimings,
  subscribeBootstrapIntegrations,
} from "../data/bootstrap_integrations";
import { domainToName } from "../data/integration";
import { Constructor } from "../types";
import { showToast } from "../util/toast";
import { HassBaseEl } from "./hass-base-mixin";
import { navigate } from "../common/navigate";

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    private _subscribedBootstrapIntegrations?: Promise<UnsubscribeFunc>;

    private _disconnectedTimeout?: number;

    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      // Need to load in advance because when disconnected, can't dynamically load code.
      setTimeout(() => import("../managers/notification-manager"), 5000);
    }

    updated(changedProperties) {
      super.updated(changedProperties);
      const oldHass = changedProperties.get("hass");
      if (!changedProperties.has("hass") || !this.hass!.config) {
        return;
      }
      if (oldHass?.config?.state !== this.hass!.config.state) {
        if (this.hass!.config.state === STATE_NOT_RUNNING) {
          showToast(this, {
            message:
              this.hass!.localize("ui.notification_toast.starting") ||
              "Home Assistant is starting, not everything will be available until it is finished.",
            duration: 0,
            dismissable: false,
            action: {
              text:
                this.hass!.localize("ui.notification_toast.dismiss") ||
                "Dismiss",
              action: () => {
                this._unsubscribeBootstrapIntegrations();
              },
            },
          });
          this._subscribeBootstrapIntegrations();
        } else if (
          oldHass?.config &&
          oldHass.config.state === STATE_NOT_RUNNING &&
          (this.hass!.config.state === STATE_STARTING ||
            this.hass!.config.state === STATE_RUNNING)
        ) {
          this._unsubscribeBootstrapIntegrations();
          showToast(this, {
            message: this.hass!.localize("ui.notification_toast.started"),
            duration: 5000,
          });
        }
      }
      if (
        this.hass!.config.safe_mode &&
        oldHass?.config?.safe_mode !== this.hass!.config.safe_mode
      ) {
        import("../dialogs/generic/show-dialog-box").then(
          ({ showAlertDialog }) => {
            showAlertDialog(this, {
              title:
                this.hass!.localize("ui.dialogs.safe_mode.title") ||
                "Safe mode",
              text:
                this.hass!.localize("ui.dialogs.safe_mode.text") ||
                "Home Assistant is running in safe mode, custom integrations and modules are not available. Restart Home Assistant to exit safe mode.",
            });
          }
        );
      }
      if (
        this.hass!.config.recovery_mode &&
        oldHass?.config?.recovery_mode !== this.hass!.config.recovery_mode
      ) {
        navigate("/");
      }
    }

    protected hassReconnected() {
      super.hassReconnected();
      if (this._disconnectedTimeout) {
        clearTimeout(this._disconnectedTimeout);
        this._disconnectedTimeout = undefined;
        return;
      }
      showToast(this, {
        message: "",
        duration: 1,
      });
    }

    protected hassDisconnected() {
      super.hassDisconnected();

      this._disconnectedTimeout = window.setTimeout(() => {
        this._disconnectedTimeout = undefined;
        showToast(this, {
          message: this.hass!.localize("ui.notification_toast.connection_lost"),
          duration: 0,
          dismissable: false,
        });
      }, 1000);
    }

    private _handleMessage(message: BootstrapIntegrationsTimings): void {
      if (this.hass!.config.state !== STATE_NOT_RUNNING) {
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
              this._unsubscribeBootstrapIntegrations();
            },
          },
        });
        return;
      }

      // Show the integration that has been starting for the longest time
      const integration = Object.entries(message).sort(
        ([, a], [, b]) => b - a
      )[0][0];

      showToast(this, {
        message:
          this.hass!.localize(
            "ui.notification_toast.integration_starting",
            "integration",
            domainToName(this.hass!.localize, integration)
          ) ||
          `Starting ${integration}, not everything will be available until it is finished.`,
        duration: 0,
        dismissable: false,
        action: {
          text:
            this.hass!.localize("ui.notification_toast.dismiss") || "Dismiss",
          action: () => {
            this._unsubscribeBootstrapIntegrations();
          },
        },
      });
    }

    private _unsubscribeBootstrapIntegrations() {
      if (this._subscribedBootstrapIntegrations) {
        this._subscribedBootstrapIntegrations.then((unsub) => unsub());
        this._subscribedBootstrapIntegrations = undefined;
      }
    }

    private _subscribeBootstrapIntegrations() {
      if (!this.hass) {
        return;
      }
      this._subscribedBootstrapIntegrations = subscribeBootstrapIntegrations(
        this.hass!,
        (message) => {
          this._handleMessage(message);
        }
      );
    }
  };
