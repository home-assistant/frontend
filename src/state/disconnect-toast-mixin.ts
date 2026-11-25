import { mdiInformationOutline } from "@mdi/js";
import type { PropertyValues } from "lit";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { BootstrapProgress } from "../data/bootstrap_integrations";
import {
  computeStartupProgress,
  startupTransition,
  subscribeBootstrapProgress,
} from "../data/bootstrap_integrations";
import type { Constructor } from "../types";
import { HOST_ACTION_TOAST_ID, showToast } from "../util/toast";
import type { HassBaseEl } from "./hass-base-mixin";
import { navigate } from "../common/navigate";
import { showStartupProgressDialog } from "../dialogs/startup-progress/show-dialog-startup-progress";

const CONNECTION_LOST_TOAST_ID = "connection-lost";
const SERVER_STARTUP_TOAST_ID = "server-startup";

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    private _subscribedBootstrapProgress?: Promise<UnsubscribeFunc>;

    private _startupProgress?: BootstrapProgress;

    private _startupProgressVisible = false;

    private _startupFinishPending = false;

    private _startupToastKey?: string;

    private _disconnectedTimeout?: number;

    protected firstUpdated(changedProps: PropertyValues<this>) {
      super.firstUpdated(changedProps);
      // Need to load in advance because when disconnected, can't dynamically load code.
      setTimeout(() => import("../managers/notification-manager"), 5000);
    }

    updated(changedProperties: PropertyValues<this>) {
      super.updated(changedProperties);
      const oldHass = changedProperties.get("hass");
      if (!changedProperties.has("hass") || !this.hass!.config) {
        return;
      }
      if (oldHass?.config?.state !== this.hass!.config.state) {
        const transition = startupTransition(
          oldHass?.config?.state,
          this.hass!.config.state
        );
        if (transition === "show") {
          this._showStartupProgress();
        } else if (transition === "finish") {
          this._requestFinishStartupProgress();
        }
      }
      this._updateStartupProgress();
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
                "Home Assistant is running in safe mode, custom integrations and community frontend modules are not available. Restart Home Assistant to exit safe mode.",
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
      // A reboot toast is obsolete once we are connected again
      showToast(this, {
        id: HOST_ACTION_TOAST_ID,
        message: "",
        duration: 0,
      });
      if (this._disconnectedTimeout) {
        clearTimeout(this._disconnectedTimeout);
        this._disconnectedTimeout = undefined;
        return;
      }
      showToast(this, {
        id: CONNECTION_LOST_TOAST_ID,
        message: "",
        duration: 0,
      });
    }

    protected hassDisconnected() {
      super.hassDisconnected();

      this._disconnectedTimeout = window.setTimeout(() => {
        this._disconnectedTimeout = undefined;
        showToast(this, {
          id: CONNECTION_LOST_TOAST_ID,
          message: this.hass!.localize("ui.notification_toast.connection_lost"),
          duration: -1,
          dismissable: false,
        });
      }, 1000);
    }

    private _showStartupProgress() {
      this._unsubscribeBootstrapProgress();
      this._startupProgress = undefined;
      this._startupFinishPending = false;
      this._startupProgressVisible = true;
      this._startupToastKey = undefined;
      this._subscribedBootstrapProgress = subscribeBootstrapProgress(
        this.hass!.connection,
        (message) => {
          this._startupProgress = message;
          if (this._startupFinishPending && message.phase === "running") {
            this._finishStartupProgress();
          }
        }
      );
      this._updateStartupProgress();
    }

    private _updateStartupProgress() {
      if (!this._startupProgressVisible) {
        return;
      }
      const message =
        this.hass!.localize("ui.startup_progress.starting") ||
        "Home Assistant is starting";
      const supportingText =
        this.hass!.localize("ui.startup_progress.starting_secondary") ||
        "Some features may not be available yet";
      // The launch screen render swap clears the root, which detaches the
      // notification manager and would remove a dialog opened before it.
      const mainRendered = !!this.renderRoot.querySelector(
        "home-assistant-main"
      );
      const detailsAvailable = mainRendered && !!this.hass!.user?.is_admin;
      const key = [
        message,
        supportingText,
        mainRendered,
        detailsAvailable,
      ].join("|");
      if (key === this._startupToastKey) {
        return;
      }
      this._startupToastKey = key;
      showToast(this, {
        id: SERVER_STARTUP_TOAST_ID,
        message,
        supportingText,
        duration: -1,
        dismissable: true,
        dismiss: () => this._hideStartupProgress(),
        action: detailsAvailable
          ? {
              text:
                this.hass!.localize("ui.startup_progress.details") ||
                "Startup details",
              icon: mdiInformationOutline,
              keepOpen: true,
              action: () => showStartupProgressDialog(this),
            }
          : undefined,
      });
    }

    // Keeps the subscription, so the completion toast still reflects late failures.
    private _hideStartupProgress() {
      this._startupProgressVisible = false;
      this._startupToastKey = undefined;
    }

    // Core can reach RUNNING before its final snapshot with the failures arrives.
    private _requestFinishStartupProgress() {
      if (this._startupProgress?.phase === "running") {
        this._finishStartupProgress();
      } else {
        this._startupFinishPending = true;
      }
    }

    private _finishStartupProgress() {
      this._startupFinishPending = false;
      const { failed } = computeStartupProgress(
        this._startupProgress,
        this.hass!.config.state
      );
      this._hideStartupProgress();
      this._unsubscribeBootstrapProgress();
      const issues = failed.length;
      showToast(this, {
        id: SERVER_STARTUP_TOAST_ID,
        message: issues
          ? this.hass!.localize("ui.notification_toast.started_with_issues", {
              count: issues,
            })
          : this.hass!.localize("ui.notification_toast.started"),
        duration: issues ? 10000 : 5000,
        action: this.hass!.user?.is_admin
          ? {
              text: this.hass!.localize("ui.notification_toast.details"),
              action: () => showStartupProgressDialog(this),
            }
          : undefined,
      });
    }

    private _unsubscribeBootstrapProgress() {
      if (this._subscribedBootstrapProgress) {
        this._subscribedBootstrapProgress.then((unsub) => unsub());
        this._subscribedBootstrapProgress = undefined;
      }
    }
  };
