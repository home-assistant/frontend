import type { ContextType } from "@lit/context";
import type { TemplateResult } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../common/decorators/consume";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";
import { apiContext } from "../data/context";
import { getAppKey } from "../data/notify_html5";
import { showPromptDialog } from "../dialogs/generic/show-dialog-box";
import type { HaSwitch } from "./ha-switch";
import { fireEvent, type HASSDomTargetEvent } from "../common/dom/fire_event";
import "./ha-switch";

export const pushSupported =
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  (document.location.protocol === "https:" ||
    document.location.hostname === "localhost" ||
    document.location.hostname === "127.0.0.1");

@customElement("ha-push-notifications-toggle")
class HaPushNotificationsToggle extends LitElement {
  @property({ type: Boolean }) public disabled!: boolean;

  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state() private _pushChecked: boolean =
    "Notification" in window && Notification.permission === "granted";

  @state() private _loading = true;

  protected render(): TemplateResult {
    return html`
      <ha-switch
        .disabled=${this.disabled || this._loading}
        .checked=${this._pushChecked}
        @change=${this._handlePushChange}
      ></ha-switch>
    `;
  }

  async connectedCallback() {
    super.connectedCallback();

    if (!pushSupported) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.pushManager) {
        return;
      }
      reg.pushManager.getSubscription().then((subscription) => {
        this._loading = false;
        this._pushChecked = !!subscription;
      });
    } catch (_err) {
      // We don't set loading to `false` so we remain disabled
    }
  }

  private _handlePushChange(ev: HASSDomTargetEvent<HaSwitch>) {
    // Somehow this is triggered on Safari on page load causing
    // it to get into a loop and crash the page.
    if (!pushSupported) return;

    const pushnotifications = (ev.target as HaSwitch).checked;
    if (pushnotifications) {
      this._subscribePushNotifications();
    } else {
      this._unsubscribePushNotifications();
    }
  }

  private async _subscribePushNotifications() {
    const reg = await navigator.serviceWorker.ready;
    let sub;

    try {
      let browserName: string;
      if (navigator.userAgent.toLowerCase().indexOf("firefox") > -1) {
        browserName = "firefox";
      } else {
        browserName = "chrome";
      }

      const name = await showPromptDialog(this, {
        title: this._localize(
          "ui.panel.profile.push_notifications.add_device_prompt.title"
        ),
        inputLabel: this._localize(
          "ui.panel.profile.push_notifications.add_device_prompt.input_label"
        ),
      });
      if (name == null) {
        this._pushChecked = false;
        return;
      }

      let applicationServerKey: Uint8Array<ArrayBuffer> | null;
      try {
        applicationServerKey = await getAppKey(this._api.callWS);
      } catch (_err) {
        applicationServerKey = null;
      }

      if (applicationServerKey) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      } else {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true });
      }

      await this._api.callApi("POST", "notify.html5", {
        subscription: sub,
        browser: browserName,
        name,
      });
    } catch (err: any) {
      const message = err.message || "Notification registration failed.";
      if (sub) {
        await sub.unsubscribe();
      }

      // eslint-disable-next-line
      console.error(err);

      fireEvent(this, "hass-notification", { message });
      this._pushChecked = false;
    }
  }

  private async _unsubscribePushNotifications() {
    const reg = await navigator.serviceWorker.ready;

    try {
      const sub = await reg.pushManager.getSubscription();

      if (!sub) return;

      await this._api.callApi("DELETE", "notify.html5", { subscription: sub });
      await sub.unsubscribe();
    } catch (err: any) {
      const message =
        err.message || "Failed unsubscribing for push notifications.";

      // eslint-disable-next-line
      console.error("Error in unsub push", err);

      fireEvent(this, "hass-notification", { message });
      this._pushChecked = true;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-push-notifications-toggle": HaPushNotificationsToggle;
  }
}
