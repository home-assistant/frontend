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

const CONNECTION_LOST_TOAST_ID = "connection-lost";
const SERVER_STARTUP_TOAST_ID = "server-startup";

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    private _subscribedBootstrapProgress?: Promise<UnsubscribeFunc>;

    private _startupProgress?: BootstrapProgress;

    private _startupProgressVisible = false;

    private _startupProgressEl?: HTMLElementTagNameMap["ha-startup-progress"];

    private _startupProgressResize?: ResizeObserver;

    private _disconnectedTimeout?: number;

    protected firstUpdated(changedProps: PropertyValues<this>) {
      super.firstUpdated(changedProps);
      // Need to load in advance because when disconnected, can't dynamically load code.
      setTimeout(() => import("../managers/notification-manager"), 5000);
      setTimeout(() => import("../components/ha-startup-progress"), 5000);
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
          this._finishStartupProgress();
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
      this._startupProgressVisible = true;
      this._subscribedBootstrapProgress = subscribeBootstrapProgress(
        this.hass!,
        (message) => {
          this._startupProgress = message;
          this._updateStartupProgress();
        }
      );
      this._updateStartupProgress();
    }

    private async _updateStartupProgress() {
      if (!this._startupProgressVisible) {
        return;
      }
      await import("../components/ha-startup-progress");
      // Hidden or finished while the component was loading.
      if (!this._startupProgressVisible) {
        return;
      }
      if (!this._startupProgressEl) {
        this._startupProgressEl = document.createElement("ha-startup-progress");
        this._startupProgressEl.addEventListener(
          "startup-progress-dismissed",
          () => this._hideStartupProgress()
        );
        // Lifts the toast stack above the card so neither covers the other.
        this._startupProgressResize = new ResizeObserver(() =>
          this.style.setProperty(
            "--ha-startup-progress-offset",
            `calc(${this._startupProgressEl?.offsetHeight ?? 0}px + var(--ha-space-2))`
          )
        );
        this._startupProgressResize.observe(this._startupProgressEl);
      }
      // The launch screen render swap clears the root, detaching the card.
      if (!this._startupProgressEl.isConnected) {
        this.renderRoot.appendChild(this._startupProgressEl);
      }
      this._startupProgressEl.progress = computeStartupProgress(
        this._startupProgress,
        this.hass!.config.state
      );
    }

    // Keeps the subscription, so the completion toast still reflects late failures.
    private _hideStartupProgress() {
      this._startupProgressVisible = false;
      this._startupProgressResize?.disconnect();
      this._startupProgressResize = undefined;
      this.style.removeProperty("--ha-startup-progress-offset");
      this._startupProgressEl?.remove();
      this._startupProgressEl = undefined;
    }

    private _finishStartupProgress() {
      const { failed, retrying } = computeStartupProgress(
        this._startupProgress,
        this.hass!.config.state
      );
      this._hideStartupProgress();
      this._unsubscribeBootstrapProgress();
      const issues = failed.length + retrying.length;
      showToast(this, {
        id: SERVER_STARTUP_TOAST_ID,
        message: issues
          ? this.hass!.localize("ui.notification_toast.started_with_issues", {
              count: issues,
            })
          : this.hass!.localize("ui.notification_toast.started"),
        duration: issues ? 10000 : 5000,
        // The integrations dashboard is only available to admins.
        action:
          issues && this.hass!.user?.is_admin
            ? {
                text: this.hass!.localize("ui.notification_toast.show"),
                action: () => navigate("/config/integrations/dashboard"),
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
